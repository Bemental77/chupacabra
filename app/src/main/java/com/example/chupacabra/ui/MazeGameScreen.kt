package com.example.chupacabra.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.chupacabra.game.Direction
import com.example.chupacabra.game.MazeGame

@Composable
fun MazeGameScreen() {
    val game = remember { MazeGame() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        // Maze fills the whole screen
        MazeCanvas(
            game = game,
            modifier = Modifier
                .fillMaxSize()
        )

        // Skills row overlays bottom of screen
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Color(0xAAEEEEEE))
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            SkillButton(
                label = "Jump",
                enabled = !game.isPaused,
                onClick = { game.jump(Direction.UP) }
            )
            SkillButton(
                label = "Break Wall",
                enabled = !game.isPaused,
                onClick = { game.breakWall(Direction.UP) }
            )
            SkillButton(
                label = "Teleport",
                enabled = !game.isPaused,
                onClick = { game.teleport(7, 7) }
            )
            SkillButton(
                label = if (game.revealedPaths) "Hide Path" else "Reveal Path",
                enabled = true,
                onClick = { game.toggleRevealPath() }
            )
            SkillButton(
                label = if (game.isPaused) "Resume" else "Pause",
                enabled = true,
                onClick = { game.togglePause() }
            )
        }
    }
}

@Composable
fun SkillButton(
    label: String,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .height(48.dp)
            .width(90.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall
        )
    }
}