package com.devvrushabh.dailyinvoicer

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AnimationUtils
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    private val splashTimeout: Long = 2800 // 2.8 seconds for full animation sequence

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val imgLogo = findViewById<ImageView>(R.id.img_splash_logo)
        val tvTitle = findViewById<TextView>(R.id.tv_splash_title)
        val tvSubtitle = findViewById<TextView>(R.id.tv_splash_subtitle)
        val progressBar = findViewById<ProgressBar>(R.id.progress_splash)
        val tvFooter = findViewById<TextView>(R.id.tv_splash_footer)
        val tvCredit = findViewById<TextView>(R.id.tv_splash_credit)

        // Load staggered animations
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

        // Navigate to MainActivity after animation completes
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this@SplashActivity, MainActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }, splashTimeout)
    }
}
