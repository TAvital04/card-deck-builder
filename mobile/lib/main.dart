
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/api_service.dart';

void main() {
  runApp(const CardDeckApp());
}

class CardDeckApp extends StatelessWidget {
  const CardDeckApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Card Deck Builder',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.black),
        scaffoldBackgroundColor: const Color(0xFFFAFAF9),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const AuthScreen(isRegister: false),
        '/register': (context) => const AuthScreen(isRegister: true),
        '/decks': (context) => const DeckScreen(),
        '/calculator': (context) => const CalculatorScreen(),
      },
    );
  }
}

class AuthScreen extends StatefulWidget {
  final bool isRegister;

  const AuthScreen({super.key, required this.isRegister});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  bool loading = false;

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (emailController.text.trim().isEmpty ||
        passwordController.text.isEmpty ||
        (widget.isRegister && nameController.text.trim().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() => loading = true);

    try {
      if (widget.isRegister) {
        final result = await ApiService.register(
          nameController.text.trim(),
          emailController.text.trim(),
          passwordController.text,
        );

        final token = result['verificationToken'];
        if (token is String && token.isNotEmpty) {
          await ApiService.verifyEmail(token);
        }

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created! Please log in.')),
        );
        Navigator.pushReplacementNamed(context, '/login');
      } else {
        await ApiService.login(
          emailController.text.trim(),
          passwordController.text,
        );

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/decks');
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final registering = widget.isRegister;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.style, size: 56),
                const SizedBox(height: 24),
                const Text(
                  'CARD DECK BUILDER',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  registering ? 'Create your account' : 'Welcome back',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                if (registering) ...[
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: loading ? null : submit,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      loading
                          ? 'Please wait...'
                          : registering ? 'Create Account' : 'Log In',
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: loading
                      ? null
                      : () => Navigator.pushReplacementNamed(
                            context,
                            registering ? '/login' : '/register',
                          ),
                  child: Text(
                    registering
                        ? 'Already have an account? Log in'
                        : 'Need an account? Register',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class DeckScreen extends StatelessWidget {
  const DeckScreen({super.key});

  Future<void> logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');

    if (!context.mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Decks'),
        actions: [
          IconButton(
            onPressed: () => logout(context),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.style, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Welcome to Card Deck Builder!',
              style: TextStyle(fontSize: 20),
            ),
            const SizedBox(height: 12),
            const Text('You are successfully logged in.'),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pushNamed(context, '/calculator'),
              child: const Text('Probability Calculator'),
            ),
          ],
        ),
      ),
    );
  }
}

class CalculatorScreen extends StatelessWidget {
  const CalculatorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Probability Calculator')),
      body: const Center(
        child: Text('Probability calculator coming soon'),
      ),
    );
  }
}
