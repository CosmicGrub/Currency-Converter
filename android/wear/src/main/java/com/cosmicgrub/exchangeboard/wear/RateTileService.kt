package com.cosmicgrub.exchangeboard.wear

import androidx.wear.tiles.ActionBuilders
import androidx.wear.tiles.ColorBuilders.argb
import androidx.wear.tiles.DimensionBuilders
import androidx.wear.tiles.DimensionBuilders.dp
import androidx.wear.tiles.DimensionBuilders.sp
import androidx.wear.tiles.LayoutElementBuilders
import androidx.wear.tiles.LayoutElementBuilders.Box
import androidx.wear.tiles.LayoutElementBuilders.Column
import androidx.wear.tiles.LayoutElementBuilders.Text
import androidx.wear.tiles.ModifiersBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import androidx.wear.tiles.TimelineBuilders
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import java.util.concurrent.Executors

private const val RESOURCES_VERSION = "1"
private const val BG = 0xFF0B1220.toInt()
private const val PANEL = 0xFF121B2E.toInt()
private const val ACCENT = 0xFFC9A227.toInt()
private const val TEXT_PRIMARY = 0xFFEDEFF3.toInt()
private const val TEXT_MUTED = 0xFF8B94A7.toInt()

/**
 * Glanceable exchange-rate Tile -- the wearable-native equivalent of the
 * phone's home-screen widget. Renders whatever is cached instantly, then
 * kicks off a background refresh and asks the system to re-request the
 * tile once fresh data lands (TileService.getUpdater(...).requestUpdate).
 *
 * Users add this manually via the watch's tile carousel (long-press the
 * watch face -> Tiles -> Exchange rates) -- that placement step can't be
 * automated from an app or from adb, by design, same as home-screen
 * widgets on the phone.
 */
class RateTileService : TileService() {

    private val executor = Executors.newSingleThreadExecutor()

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest
    ): ListenableFuture<TileBuilders.Tile> {
        // The Tile stays glanceable (3 rows) even though RateFetcher now
        // tracks a longer list for the companion activity's scrollable
        // view -- a Tile that needs scrolling defeats the point of a Tile.
        val (allCached, updated) = RateFetcher.readCache(this)
        val cached = allCached.take(3)

        // Kick a refresh in the background; if it succeeds, ask the system
        // to re-request this tile so the carousel picks up fresh numbers.
        executor.execute {
            val fresh = RateFetcher.fetch()
            if (fresh != null) {
                RateFetcher.writeCache(this, fresh)
                getUpdater(this).requestUpdate(RateTileService::class.java)
            }
        }

        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setTimeline(
                TimelineBuilders.Timeline.Builder()
                    .addTimelineEntry(
                        TimelineBuilders.TimelineEntry.Builder()
                            .setLayout(
                                LayoutElementBuilders.Layout.Builder()
                                    .setRoot(rootLayout(cached, updated))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()

        return Futures.immediateFuture(tile)
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        return Futures.immediateFuture(
            ResourceBuilders.Resources.Builder().setVersion(RESOURCES_VERSION).build()
        )
    }

    private fun rootLayout(
        rates: List<RateSnapshot>,
        updated: String
    ): LayoutElementBuilders.LayoutElement {
        val openApp = ModifiersBuilders.Clickable.Builder()
            .setOnClick(
                ActionBuilders.LaunchAction.Builder()
                    .setAndroidActivity(
                        ActionBuilders.AndroidActivity.Builder()
                            .setPackageName(packageName)
                            .setClassName("com.cosmicgrub.exchangeboard.wear.MainActivity")
                            .build()
                    )
                    .build()
            )
            .build()

        val column = Column.Builder()
            .addContent(
                Text.Builder()
                    .setText("EXCHANGE BOARD")
                    .setFontStyle(
                        LayoutElementBuilders.FontStyle.Builder()
                            .setSize(sp(11f))
                            .setColor(argb(ACCENT))
                            .setWeight(LayoutElementBuilders.FONT_WEIGHT_BOLD)
                            .build()
                    )
                    .build()
            )

        rates.forEach { snapshot ->
            column.addContent(
                Text.Builder()
                    .setText(
                        "USD/${snapshot.code}  " +
                            (snapshot.rate?.let { String.format("%.4f", it) } ?: "--")
                    )
                    .setFontStyle(
                        LayoutElementBuilders.FontStyle.Builder()
                            .setSize(sp(15f))
                            .setColor(argb(TEXT_PRIMARY))
                            .build()
                    )
                    .build()
            )
        }

        column.addContent(
            Text.Builder()
                .setText(updated)
                .setFontStyle(
                    LayoutElementBuilders.FontStyle.Builder()
                        .setSize(sp(9f))
                        .setColor(argb(TEXT_MUTED))
                        .build()
                )
                .build()
        )

        return Box.Builder()
            .setWidth(DimensionBuilders.expand())
            .setHeight(DimensionBuilders.expand())
            .setModifiers(
                ModifiersBuilders.Modifiers.Builder()
                    .setBackground(
                        ModifiersBuilders.Background.Builder()
                            .setColor(argb(BG))
                            .setCorner(
                                ModifiersBuilders.Corner.Builder().setRadius(dp(0f)).build()
                            )
                            .build()
                    )
                    .setClickable(openApp)
                    .setPadding(
                        ModifiersBuilders.Padding.Builder()
                            .setAll(dp(12f))
                            .build()
                    )
                    .build()
            )
            .addContent(column.build())
            .build()
    }
}
