package com.iroennys.iropi

import android.app.Application
import android.os.Environment

class IROPIApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: IROPIApp
            private set

        fun getIropiDir(): String {
            return instance.filesDir.absolutePath
        }

        fun getNodeBinPath(): String {
            return "${getIropiDir()}/nodejs/bin/node"
        }

        fun getIropiCliPath(): String {
            return "${getIropiDir()}/iropi/dist/cli.js"
        }
    }
}
