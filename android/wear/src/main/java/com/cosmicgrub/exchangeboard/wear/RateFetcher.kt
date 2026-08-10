package com.cosmicgrub.exchangeboard.wear

import android.content.Context
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Locale
import org.json.JSONObject

/**
 * Same idea as the phone widget's fetcher: the watch is its own process on
 * its own network connection (often independent of the phone, especially
 * on LTE models), so it does its own lightweight fetch straight from
 * open.er-api.com rather than trying to relay through the phone app.
 */
data class RateSnapshot(val code: String, val rate: Double?)

object RateFetcher {
    private const val RATES_URL = "https://open.er-api.com/v6/latest/USD"
    private val QUICK_CODES = listOf("EUR", "GBP", "JPY")
    private const val PREFS = "exchangeboard_wear"

    fun quickCodes(): List<String> = QUICK_CODES

    /** Blocking network call -- always run off the main thread. */
    fun fetch(): List<RateSnapshot>? {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(RATES_URL)
            conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 8000
                readTimeout = 8000
                requestMethod = "GET"
            }
            val body = conn.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            val rates = JSONObject(body).getJSONObject("rates")
            QUICK_CODES.map { code ->
                RateSnapshot(code, if (rates.has(code)) rates.getDouble(code) else null)
            }
        } catch (e: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }

    fun writeCache(context: Context, snapshots: List<RateSnapshot>) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        snapshots.forEach { prefs.putString(it.code, it.rate?.toString()) }
        prefs.putString("updated", SimpleDateFormat("h:mm a", Locale.US).format(java.util.Date()))
        prefs.apply()
    }

    fun readCache(context: Context): Pair<List<RateSnapshot>, String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val snapshots = QUICK_CODES.map { code ->
            RateSnapshot(code, prefs.getString(code, null)?.toDoubleOrNull())
        }
        return snapshots to (prefs.getString("updated", null) ?: "Not yet loaded")
    }
}
