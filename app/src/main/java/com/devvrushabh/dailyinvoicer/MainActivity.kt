package com.devvrushabh.dailyinvoicer

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results = if (result.resultCode == RESULT_OK && result.data != null) {
                val dataString = result.data?.dataString
                if (dataString != null) arrayOf(Uri.parse(dataString)) else null
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
        webView.setBackgroundColor(android.graphics.Color.parseColor("#090d16"))
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.builtInZoomControls = true
        settings.displayZoomControls = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK

        // Enable popups & window management for Google Auth / Firebase Auth
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(true)

        // Custom User-Agent to bypass Google OAuth disallowed_useragent restriction in Android WebView
        val rawUserAgent = settings.userAgentString
        settings.userAgentString = rawUserAgent.replace("; wv", "").replace("Version/4.0 ", "")

        // Interface for Native Android interaction
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("upi://")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "No handler app found for action", Toast.LENGTH_SHORT).show()
                        return true
                    }
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                val popupWebView = WebView(this@MainActivity)
                popupWebView.settings.javaScriptEnabled = true
                popupWebView.settings.domStorageEnabled = true
                popupWebView.settings.userAgentString = webView.settings.userAgentString
                popupWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                        val url = request?.url?.toString() ?: return false
                        if (url.contains("accounts.google.com") || url.contains("firebaseapp.com")) {
                            view?.loadUrl(url)
                            return true
                        }
                        return false
                    }
                }
                val transport = resultMsg?.obj as? WebView.WebViewTransport
                transport?.webView = popupWebView
                resultMsg?.sendToTarget()
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent()
                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        // Handle Android Back Navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Load local assets single-page web app
        webView.loadUrl("file:///android_asset/index.html")
    }

    inner class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun printInvoice(jobName: String) {
            runOnUiThread {
                val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
                val printAdapter: PrintDocumentAdapter = webView.createPrintDocumentAdapter(jobName)
                printManager.print(jobName, printAdapter, PrintAttributes.Builder().build())
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun savePdf(base64Data: String, fileName: String) {
            runOnUiThread {
                try {
                    val cleanFileName = if (fileName.endsWith(".pdf", ignoreCase = true)) fileName else "$fileName.pdf"
                    val pdfBytes = decodeBase64Pdf(base64Data)
                    if (pdfBytes == null) {
                        Toast.makeText(context, "Failed to decode PDF data", Toast.LENGTH_SHORT).show()
                        return@runOnUiThread
                    }

                    var savedUri: Uri? = null

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val contentValues = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, cleanFileName)
                            put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                            put(MediaStore.MediaColumns.IS_PENDING, 1)
                        }

                        val resolver = context.contentResolver
                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                        if (uri != null) {
                            resolver.openOutputStream(uri)?.use { outputStream ->
                                outputStream.write(pdfBytes)
                            }
                            contentValues.clear()
                            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                            resolver.update(uri, contentValues, null, null)
                            savedUri = uri
                        }
                    } else {
                        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        if (!downloadsDir.exists()) {
                            downloadsDir.mkdirs()
                        }
                        val pdfFile = File(downloadsDir, cleanFileName)
                        FileOutputStream(pdfFile).use { outputStream ->
                            outputStream.write(pdfBytes)
                        }
                        savedUri = Uri.fromFile(pdfFile)
                        MediaScannerConnection.scanFile(
                            context,
                            arrayOf(pdfFile.absolutePath),
                            arrayOf("application/pdf"),
                            null
                        )
                    }

                    if (savedUri != null) {
                        Toast.makeText(context, "PDF saved to Downloads folder: $cleanFileName", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(context, "Failed to save PDF to Downloads", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(context, "Error saving PDF: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun sharePdf(base64Data: String, fileName: String) {
            runOnUiThread {
                try {
                    val cleanFileName = if (fileName.endsWith(".pdf", ignoreCase = true)) fileName else "$fileName.pdf"
                    val pdfBytes = decodeBase64Pdf(base64Data)
                    if (pdfBytes == null) {
                        Toast.makeText(context, "Failed to decode PDF for sharing", Toast.LENGTH_SHORT).show()
                        return@runOnUiThread
                    }

                    val cacheDir = File(context.cacheDir, "invoices")
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs()
                    }
                    val pdfFile = File(cacheDir, cleanFileName)
                    FileOutputStream(pdfFile).use { outputStream ->
                        outputStream.write(pdfBytes)
                    }

                    val contentUri = FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        pdfFile
                    )

                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "application/pdf"
                        putExtra(Intent.EXTRA_STREAM, contentUri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }

                    val chooser = Intent.createChooser(shareIntent, "Share Invoice PDF")
                    context.startActivity(chooser)
                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(context, "Error sharing PDF: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }

        private fun decodeBase64Pdf(base64Data: String): ByteArray? {
            return try {
                val cleanBase64 = if (base64Data.contains(",")) {
                    base64Data.substringAfter(",")
                } else {
                    base64Data
                }
                Base64.decode(cleanBase64, Base64.DEFAULT)
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
}
