package com.plugin.vop

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
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
        val window = activity.window
        if (activity.resources.configuration.orientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE) {
            (activity as AppCompatActivity).setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.setSystemBarsAppearance(
                    0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                )
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = 0
            }
        } else {
            (activity as AppCompatActivity).setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false)
                window.insetsController?.apply {
                    // 隐藏状态栏（可选）
                    hide(WindowInsets.Type.statusBars())
                    // 设置状态栏透明
                    window.statusBarColor = Color.TRANSPARENT
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility =
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                window.statusBarColor = Color.TRANSPARENT
            }
        }
        val ret = JSObject()
        invoke.resolve(ret)
    }
}
