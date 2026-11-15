import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'screens/calc_screen.dart';
import 'screens/deck_list_screen.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final hasToken = (prefs.getString('token') ?? '').isNotEmpty;
  runApp(CardDeckApp(hasToken: hasToken));
}

class CardDeckApp extends StatelessWidget {
  final bool hasToken;

  const CardDeckApp({super.key, required this.hasToken});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Card Deck Builder',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF96516B),
        ),
        scaffoldBackgroundColor: const Color(0xFFFAFAF9),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      initialRoute: hasToken ? '/decks' : '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const LoginScreen(registering: true),
        '/decks': (context) => const DeckListScreen(),
        '/calculator': (context) => const CalcScreen(),
      },
    );
  }
}
