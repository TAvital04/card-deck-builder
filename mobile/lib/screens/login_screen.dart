import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  final bool registering;

  const LoginScreen({super.key, this.registering = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    setState(() => loading = true);

    try {
      if (widget.registering) {
        final result = await ApiService.register(
          name.text.trim(), email.text.trim(), password.text,
        );
        final verificationToken = result['verificationToken'];
        if (verificationToken is String && verificationToken.isNotEmpty) {
          await ApiService.verifyEmail(verificationToken);
        }
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Account created. You can now log in.'),
        ));
        Navigator.pushReplacementNamed(context, '/login');
      } else {
        await ApiService.login(email.text.trim(), password.text);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/decks');
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error.toString().replaceFirst('Exception: ', '')),
      ));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.style, size: 58),
                  const SizedBox(height: 24),
                  const Text('CARD DECK BUILDER',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  const SizedBox(height: 12),
                  Text(widget.registering ? 'Create your account' : 'Welcome back',
                    textAlign: TextAlign.center),
                  const SizedBox(height: 32),
                  if (widget.registering) ...[
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (value) => (value ?? '').trim().isEmpty ? 'Enter a name' : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: (value) {
                      final valueText = (value ?? '').trim();
                      return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(valueText)
                          ? null : 'Enter a valid email';
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Password'),
                    validator: (value) => (value ?? '').length < 6
                        ? 'Password must be at least 6 characters' : null,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: loading ? null : submit,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(loading ? 'Please wait...' : widget.registering ? 'Create Account' : 'Log In'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: loading ? null : () => Navigator.pushReplacementNamed(
                      context, widget.registering ? '/login' : '/register',
                    ),
                    child: Text(widget.registering
                      ? 'Already have an account? Log in'
                      : 'Need an account? Register'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
