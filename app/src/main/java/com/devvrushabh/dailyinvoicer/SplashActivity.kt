package com.devvrushabh.dailyinvoicer

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AnimationUtils
import android.webkit.WebView
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    private val splashTimeout: Long = 800 // Optimized fast load timing (800ms)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val imgLogo = findViewById<ImageView>(R.id.img_splash_logo)
        val tvTitle = findViewById<TextView>(R.id.tv_splash_title)
        val tvSubtitle = findViewById<TextView>(R.id.tv_splash_subtitle)
        val progressBar = findViewById<ProgressBar>(R.id.progress_splash)
        val tvFooter = findViewById<TextView>(R.id.tv_splash_footer)
        val tvCredit = findViewById<TextView>(R.id.tv_splash_credit)

        // Load fast staggered animations
        val logoAnim = AnimationUtils.loadAnimation(this, R.anim.splash_logo_anim)
        val titleAnim = AnimationUtils.loadAnimation(this, R.anim.splash_fade_in)
        val subtitleAnim = AnimationUtils.loadAnimation(this, R.anim.splash_subtitle_anim)
        val progressAnim = AnimationUtils.loadAnimation(this, R.anim.splash_progress_anim)
        val footerAnim = AnimationUtils.loadAnimation(this, R.anim.splash_footer_anim)

        // Start staggered animation sequence
        imgLogo.startAnimation(logoAnim)
        tvTitle.startAnimation(titleAnim)
        tvSubtitle.startAnimation(subtitleAnim)
        progressBar.startAnimation(progressAnim)
        tvFooter.startAnimation(footerAnim)
        tvCredit.startAnimation(footerAnim)

        // Pre-warm WebView runtime engine in idle looper thread for instant loading
        Looper.myQueue().addIdleHandler {
            try {
                WebView(applicationContext)
            } catch (_: Exception) {
                // Ignore pre-warm errors
            }
            false // Run once
        }

        // Navigate to MainActivity after fast animation sequence
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this@SplashActivity, MainActivity::class.java)
            startActivity(intent)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, R.anim.main_fade_enter, R.anim.splash_fade_exit)
            } else {
                @Suppress("DEPRECATION")
                overridePendingTransition(R.anim.main_fade_enter, R.anim.splash_fade_exit)
            }
            finish()
        }, splashTimeout)
    }
}
