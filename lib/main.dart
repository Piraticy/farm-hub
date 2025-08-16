import 'package:flame/game.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(GameWidget(game: MyGame()));
}

class MyGame extends FlameGame {
  @override
  void render(Canvas canvas) {
    // Draw a red square
    final paint = Paint()..color = const Color(0xFFFF0000);
    canvas.drawRect(Rect.fromLTWH(100, 100, 100, 100), paint);
  }

  @override
  void update(double dt) {
    // Game logic will go here later
  }
}
