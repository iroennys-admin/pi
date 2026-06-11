package com.iroennys.iropi

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.io.*

class NodeJSService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var nodeProcess: Process? = null
    private var rpcPort: Int = 9876

    companion object {
        const val CHANNEL_ID = "iropi_nodejs_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.iroennys.iropi.START"
        const val ACTION_STOP = "com.iroennys.iropi.STOP"
        const val EXTRA_PORT = "port"

        var isRunning = false
            private set
        var currentPort = 9876
            private set
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopNode()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START -> {
                rpcPort = intent.getIntExtra(EXTRA_PORT, 9876)
                currentPort = rpcPort
                startForeground(NOTIFICATION_ID, createNotification())
                startNode()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startNode() {
        serviceScope.launch {
            try {
                val iropiDir = IROPIApp.getIropiDir()

                // Ensure Node.js binary is executable
                val nodeBin = File(IROPIApp.getNodeBinPath())
                if (!nodeBin.exists()) {
                    notifyState("Error: Node.js no encontrado")
                    return@launch
                }

                nodeBin.setExecutable(true)

                // Set up environment
                val env = System.getenv().toMutableMap()
                env["HOME"] = iropiDir
                env["PATH"] = "${iropiDir}/nodejs/bin:${env["PATH"] ?: ""}"
                env["IROPI_CODING_AGENT"] = "true"
                env["IROPI_CODING_AGENT_DIR"] = "$iropiDir/.iropi/agent"

                // Start IROPI in RPC mode
                val cliPath = IROPIApp.getIropiCliPath()
                val workDir = File(iropiDir)

                val processBuilder = ProcessBuilder(
                    nodeBin.absolutePath,
                    cliPath,
                    "--mode", "rpc",
                    "--port", rpcPort.toString()
                ).apply {
                    directory(workDir)
                    environment().putAll(env)
                    redirectErrorStream(true)
                }

                nodeProcess = processBuilder.start()
                isRunning = true
                notifyState("IROPI ejecutándose en puerto $rpcPort")

                // Read output in background
                val reader = BufferedReader(InputStreamReader(nodeProcess?.inputStream))
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    // Log node output for debugging
                    android.util.Log.d("IROPI-NodeJS", line ?: "")
                }

                nodeProcess?.waitFor()
                isRunning = false
                notifyState("IROPI se detuvo")

            } catch (e: Exception) {
                isRunning = false
                notifyState("Error: ${e.message}")
                android.util.Log.e("IROPI-NodeJS", "Error starting Node.js", e)
            }
        }
    }

    private fun stopNode() {
        nodeProcess?.destroy()
        nodeProcess = null
        isRunning = false
    }

    private fun notifyState(message: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("IROPI")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("IROPI")
            .setContentText("Agente de codificación AI ejecutándose")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "IROPI Node.js Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Servicio de IROPI Agent"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        stopNode()
        serviceScope.cancel()
        super.onDestroy()
    }
}
