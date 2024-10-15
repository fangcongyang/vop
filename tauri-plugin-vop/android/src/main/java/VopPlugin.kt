package com.plugin.vop

import android.app.Activity
import android.content.pm.ActivityInfo
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
class PingArgs {
  var value: String? = null
}

@TauriPlugin
class VopPlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Example()

    override fun load(webView: WebView) {
        (activity as AppCompatActivity).setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
    }

    @Command
    fun toggle_screen_orientation(invoke: Invoke) {
        if (activity.resources.configuration.orientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE) {
            (activity as AppCompatActivity).setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
        } else {
            (activity as AppCompatActivity).setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
        }
        val ret = JSObject()
        invoke.resolve(ret)
    }
}
