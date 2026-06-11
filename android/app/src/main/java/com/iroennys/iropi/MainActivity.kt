package com.iroennys.iropi

import android.annotation.SuppressLint
import android.content.*
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

import kotlinx.coroutines.*
import java.io.*
import java.util.zip.ZipInputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var inputField: EditText
    private lateinit var sendButton: ImageButton

    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var rpcPort = 9876
    private var isNodeReady = false

    private val nodeReadyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.iroennys.iropi.NODE_READY") {
                isNodeReady = true
                loadWebView()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        statusText = findViewById(R.id.statusText)
        inputField = findViewById(R.id.inputField)
        sendButton = findViewById(R.id.sendButton)

        // Configure WebView
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }
        }

        // Send button
        sendButton.setOnClickListener {
            sendMessage()
        }

        // Enter key sends message
        inputField.setOnKeyListener { _, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN) {
                sendMessage()
                true
            } else {
                false
            }
        }

        // Initialize on first run
        mainScope.launch {
            if (needsSetup()) {
                statusText.text = "Instalando IROPI por primera vez..."
                statusText.visibility = View.VISIBLE
                progressBar.visibility = View.VISIBLE
                withContext(Dispatchers.IO) {
                    setupIropi()
                }
            }
            startNodeJS()
        }
    }

    private fun needsSetup(): Boolean {
        val prefs = getSharedPreferences("iropi", MODE_PRIVATE)
        val nodeBin = File(IROPIApp.getNodeBinPath())
        return !prefs.getBoolean("setup_done", false) || !nodeBin.exists()
    }

    private suspend fun setupIropi() {
        val iropiDir = IROPIApp.getIropiDir()

        // Extract IROPI files from assets
        extractAssetFolder("iropi", "$iropiDir/iropi")

        // Download and extract Node.js binary
        setupNodeJS(iropiDir)

        // Mark setup as done
        getSharedPreferences("iropi", MODE_PRIVATE).edit().putBoolean("setup_done", true).apply()
    }

    private fun setupNodeJS(iropiDir: String) {
        val nodeDir = File("$iropiDir/nodejs/bin")
        nodeDir.mkdirs()

        // Try to extract bundled node binary from assets
        val abi = Build.SUPPORTED_ABIS[0]
        val assetName = "nodejs/node-$abi"

        try {
            val inputStream = assets.open(assetName)
            val outputFile = File(nodeDir, "node")
            outputFile.outputStream().use { out ->
                inputStream.copyTo(out)
            }
            outputFile.setExecutable(true, false)
            outputFile.setReadable(true, false)
        } catch (e: IOException) {
            // Node binary not in assets - will be downloaded on first run
            android.util.Log.w("IROPI", "Node.js binary not found in assets for ABI: $abi", e)
        }
    }

    private fun extractAssetFolder(srcPath: String, destPath: String) {
        val assetManager = assets
        try {
            val files = assetManager.list(srcPath) ?: return
            val destDir = File(destPath)
            if (!destDir.exists()) destDir.mkdirs()

            for (file in files) {
                val srcFile = "$srcPath/$file"
                val destFile = File(destDir, file)

                // Check if it's a directory or file
                val subFiles = assetManager.list(srcFile)
                if (subFiles != null && subFiles.isNotEmpty()) {
                    extractAssetFolder(srcFile, destFile.absolutePath)
                } else {
                    try {
                        assetManager.open(srcFile).use { input ->
                            FileOutputStream(destFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                    } catch (e: IOException) {
                        android.util.Log.w("IROPI", "Failed to extract $srcFile", e)
                    }
                }
            }
        } catch (e: IOException) {
            android.util.Log.e("IROPI", "Failed to list assets at $srcPath", e)
        }
    }

    private fun startNodeJS() {
        val nodeBin = File(IROPIApp.getNodeBinPath())
        if (!nodeBin.exists()) {
            statusText.text = "Descargando Node.js..."
            mainScope.launch(Dispatchers.IO) {
                downloadNodeJS()
                withContext(Dispatchers.Main) {
                    startNodeJSService()
                }
            }
        } else {
            startNodeJSService()
        }
    }

    private suspend fun downloadNodeJS() {
        val abi = Build.SUPPORTED_ABIS[0]
        val arch = when (abi) {
            "arm64-v8a" -> "arm64"
            "armeabi-v7a" -> "armv7l"
            else -> "arm64"
        }

        val nodeVersion = "v22.12.0"
        val url = "https://unofficial-builds.nodejs.org/download/release/$nodeVersion/node-$nodeVersion-linux-$arch.tar.gz"

        val iropiDir = IROPIApp.getIropiDir()
        val nodeDir = File("$iropiDir/nodejs")
        val tmpFile = File("$iropiDir/node-temp.tar.gz")

        try {
            // Download
            val connection = java.net.URL(url).openConnection()
            connection.connect()
            connection.getInputStream().use { input ->
                FileOutputStream(tmpFile).use { output ->
                    input.copyTo(output)
                }
            }

            // Extract
            extractTarGz(tmpFile, nodeDir)

            // Make node executable
            val nodeBin = File("$iropiDir/nodejs/bin/node")
            if (nodeBin.exists()) {
                nodeBin.setExecutable(true, false)
                nodeBin.setReadable(true, false)
            }
        } catch (e: Exception) {
            android.util.Log.e("IROPI", "Failed to download Node.js", e)
        } finally {
            tmpFile.delete()
        }
    }

    private fun extractTarGz(tarGzFile: File, destDir: File) {
        destDir.mkdirs()
        val process = Runtime.getRuntime().exec(
            "tar -xzf ${tarGzFile.absolutePath} -C ${destDir.absolutePath} --strip-components=1"
        )
        process.waitFor()
    }

    private fun startNodeJSService() {
        statusText.text = "Iniciando IROPI Agent..."
        statusText.visibility = View.VISIBLE
        progressBar.visibility = View.VISIBLE

        val intent = Intent(this, NodeJSService::class.java).apply {
            action = NodeJSService.ACTION_START
            putExtra(NodeJSService.EXTRA_PORT, rpcPort)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        // Wait a bit for Node.js to start, then load WebView
        mainScope.launch {
            delay(3000)
            loadWebView()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun loadWebView() {
        statusText.visibility = View.GONE
        progressBar.visibility = View.GONE

        // Load the chat UI
        val html = generateChatHTML()
        webView.loadDataWithBaseURL("http://localhost:$rpcPort", html, "text/html", "UTF-8", null)
    }

    private fun sendMessage() {
        val message = inputField.text.toString().trim()
        if (message.isEmpty()) return

        inputField.text.clear()

        // Send message to IROPI via RPC
        webView.evaluateJavascript(
            "if(typeof sendMessage === 'function') sendMessage('${message.replace("'", "\\'")}');",
            null
        )
    }

    private fun generateChatHTML(): String {
        return """
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>IROPI</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0d1117;
    color: #e6edf3;
    height: 100vh;
    display: flex;
    flex-direction: column;
}
.header {
    background: #161b22;
    border-bottom: 1px solid #30363d;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.header h1 {
    font-size: 18px;
    color: #58a6ff;
}
.header .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #3fb950;
}
.chat {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.msg {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
}
.msg.user {
    align-self: flex-end;
    background: #1f6feb;
    color: #fff;
    border-bottom-right-radius: 4px;
}
.msg.assistant {
    align-self: flex-start;
    background: #21262d;
    color: #e6edf3;
    border-bottom-left-radius: 4px;
}
.msg.system {
    align-self: center;
    background: transparent;
    color: #8b949e;
    font-size: 12px;
    text-align: center;
}
.msg code {
    background: #161b22;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
}
.msg pre {
    background: #161b22;
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
}
.msg pre code {
    background: none;
    padding: 0;
}
.typing {
    display: none;
    align-self: flex-start;
    padding: 10px 14px;
    background: #21262d;
    border-radius: 12px;
}
.typing.show { display: flex; gap: 4px; }
.typing span {
    width: 6px; height: 6px;
    background: #8b949e;
    border-radius: 50%;
    animation: bounce 1.4s infinite;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
}
.input-area {
    background: #161b22;
    border-top: 1px solid #30363d;
    padding: 12px 16px;
    display: flex;
    gap: 8px;
}
.input-area input {
    flex: 1;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px 14px;
    color: #e6edf3;
    font-size: 14px;
    outline: none;
}
.input-area input:focus {
    border-color: #58a6ff;
}
.input-area button {
    background: #1f6feb;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
.input-area button:hover {
    background: #388bfd;
}
</style>
</head>
<body>
<div class="header">
    <div class="dot"></div>
    <h1>IROPI</h1>
</div>
<div class="chat" id="chat">
    <div class="msg system">IROPI Agent listo. Escribe un mensaje para empezar.</div>
</div>
<div class="typing" id="typing">
    <span></span><span></span><span></span>
</div>
<div class="input-area">
    <input type="text" id="msgInput" placeholder="Escribe un mensaje..." autocomplete="off">
    <button onclick="sendMessage()">Enviar</button>
</div>
<script>
const chat = document.getElementById('chat');
const typing = document.getElementById('typing');
const msgInput = document.getElementById('msgInput');
const RPC_PORT = $rpcPort;

msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
});

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function showTyping() { typing.classList.add('show'); chat.scrollTop = chat.scrollHeight; }
function hideTyping() { typing.classList.remove('show'); }

function sendMessage(text) {
    const msg = text || msgInput.value.trim();
    if (!msg) return;
    msgInput.value = '';
    addMessage('user', msg);
    showTyping();

    fetch('http://localhost:' + RPC_PORT + '/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg, mode: 'text' })
    })
    .then(r => r.json())
    .then(data => {
        hideTyping();
        addMessage('assistant', data.content || data.response || JSON.stringify(data));
    })
    .catch(err => {
        hideTyping();
        addMessage('assistant', 'Error de conexion: ' + err.message + '\\n\\nAsegurate de que IROPI esta configurado con una API key.');
    });
}
</script>
</body>
</html>
        """.trimIndent()
    }

    override fun onDestroy() {
        mainScope.cancel()
        super.onDestroy()
    }
}
