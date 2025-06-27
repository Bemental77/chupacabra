package com.example.chupacabra.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import com.example.chupacabra.game.Direction
import com.example.chupacabra.game.MazeGame
import kotlin.math.abs

@Composable
fun MazeCanvas(game: MazeGame, modifier: Modifier = Modifier) {
    val focusRequester = remember { FocusRequester() }

    Canvas(
        modifier = modifier
            .background(Color.White)
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown) {
                    when (keyEvent.key) {
                        Key.DirectionUp -> { game.movePlayer(Direction.UP); true }
                        Key.DirectionDown -> { game.movePlayer(Direction.DOWN); true }
                        Key.DirectionLeft -> { game.movePlayer(Direction.LEFT); true }
                        Key.DirectionRight -> { game.movePlayer(Direction.RIGHT); true }
                        else -> false
                    }
                } else false
            }
            .pointerInput(Unit) {
                detectDragGestures { _, dragAmount ->
                    val threshold = 50f
                    if (abs(dragAmount.x) > threshold || abs(dragAmount.y) > threshold) {
                        when {
                            abs(dragAmount.x) > abs(dragAmount.y) -> {
                                if (dragAmount.x > 0) game.movePlayer(Direction.RIGHT)
                                else game.movePlayer(Direction.LEFT)
                            }
                            else -> {
                                if (dragAmount.y > 0) game.movePlayer(Direction.DOWN)
                                else game.movePlayer(Direction.UP)
                            }
                        }
                    }
                }
            }
    ) {
        val cols = game.maze[0].size
        val rows = game.maze.size
        val cellWidth = size.width / cols
        val cellHeight = size.height / rows

        // Draw maze
        for (y in 0 until rows) {
            for (x in 0 until cols) {
                val color = if (game.maze[y][x] == 1) Color.Black else Color.White
                drawRect(
                    color = color,
                    topLeft = androidx.compose.ui.geometry.Offset(x * cellWidth, y * cellHeight),
                    size = androidx.compose.ui.geometry.Size(cellWidth, cellHeight)
                )
                drawRect(
                    color = Color.Gray,
                    topLeft = androidx.compose.ui.geometry.Offset(x * cellWidth, y * cellHeight),
                    size = androidx.compose.ui.geometry.Size(cellWidth, cellHeight),
                    style = Stroke(width = 1f)
                )
            }
        }

        // Draw revealed paths
        if (game.revealedPaths) {
            for (y in 0 until rows) {
                for (x in 0 until cols) {
                    if (game.maze[y][x] == 0) {
                        drawRect(
                            color = Color.Yellow.copy(alpha = 0.3f),
                            topLeft = androidx.compose.ui.geometry.Offset(x * cellWidth, y * cellHeight),
                            size = androidx.compose.ui.geometry.Size(cellWidth, cellHeight)
                        )
                    }
                }
            }
        }

        // Draw player
        val paddingX = cellWidth * 0.1f
        val paddingY = cellHeight * 0.1f
        drawOval(
            color = Color.Red,
            topLeft = androidx.compose.ui.geometry.Offset(
                game.playerX * cellWidth + paddingX,
                game.playerY * cellHeight + paddingY
            ),
            size = androidx.compose.ui.geometry.Size(
                cellWidth - 2 * paddingX,
                cellHeight - 2 * paddingY
            )
        )

        // Draw pause overlay
        if (game.isPaused) {
            drawRect(
                color = Color.Black.copy(alpha = 0.5f),
                topLeft = androidx.compose.ui.geometry.Offset.Zero,
                size = androidx.compose.ui.geometry.Size(size.width, size.height)
            )
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}