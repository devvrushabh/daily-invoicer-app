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

    private val splashTimeout: Long = 2200 // 2.2 seconds

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val imgLogo = findViewById<ImageView>(R.id.img_splash_logo)
        val tvTitle = findViewById<TextView>(R.id.tv_splash_title)
        val tvSubtitle = findViewById<TextView>(R.id.tv_splash_subtitle)
        val progressBar = findViewById<ProgressBar>(R.id.progress_splash)
        val tvFooter = findViewById<TextView>(R.id.tv_splash_footer)

        // Load Animations
        val logoAnimation = AnimationUtils.loadAnimation(this, R.anim.splash_logo_anim)
        val textAnimation = AnimationUtils.loadAnimation(this, R.anim.splash_fade_in)

        // Start Animations
        imgLogo.startAnimation(logoAnimation)
        tvTitle.startAnimation(textAnimation)
        tvSubtitle.startAnimation(textAnimation)
        progressBar.startAnimation(textAnimation)
        tvFooter.startAnimation(textAnimation)

        // Delayed Navigation to MainActivity
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this@SplashActivity, MainActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }, splashTimeout)
    }
}
