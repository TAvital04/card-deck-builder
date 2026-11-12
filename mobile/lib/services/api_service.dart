import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5050/api',
  );

  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = false,
    Map<String, String>? query,
  }) async {
    final base = Uri.parse('$baseUrl$path');
    final url = query == null ? base : base.replace(queryParameters: query);
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (authenticated) {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null || token.isEmpty) {
        throw Exception('Please log in to view your decks.');
      }
      headers['Authorization'] = 'Bearer $token';
    }

    late http.Response response;
    try {
      if (method == 'GET') {
        response = await http.get(url, headers: headers)
            .timeout(const Duration(seconds: 15));
      } else {
        response = await http.post(
          url,
          headers: headers,
          body: jsonEncode(body ?? {}),
        ).timeout(const Duration(seconds: 15));
      }
    } on TimeoutException {
      throw Exception('Server timed out. Make sure the backend is running.');
    } catch (_) {
      throw Exception('Cannot connect to the backend at $baseUrl.');
    }

    if (response.body.trim().isEmpty) {
      throw Exception('Server returned an empty response (${response.statusCode}).');
    }

    late Map<String, dynamic> data;
    try {
      data = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception('Server returned an invalid response (${response.statusCode}).');
    }

    if (response.statusCode >= 400 || data['success'] == false) {
      throw Exception(data['message'] ?? 'Request failed (${response.statusCode}).');
    }
    return data;
  }

  static Future<Map<String, dynamic>> register(
    String name,
    String email,
    String password,
  ) => _request('POST', '/auth/register', body: {
    'name': name,
    'email': email,
    'password': password,
  });

  static Future<Map<String, dynamic>> verifyEmail(String token) =>
      _request('POST', '/auth/verify-email', body: {'token': token});

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'email': email,
      'password': password,
    });
    final token = data['token'];
    if (token is! String || token.isEmpty) {
      throw Exception('Server did not return an authentication token.');
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    return data;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Future<List<Map<String, dynamic>>> getDecks() async {
    final response = await _request('GET', '/decks', authenticated: true);
    final decks = response['data'];
    if (decks is! List) throw Exception('Invalid decks response from server.');
    return decks.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  static Future<List<Map<String, dynamic>>> searchCards(String query) async {
    final response = await _request(
      'GET',
      '/cards/search',
      query: {'query': RegExp.escape(query.trim())},
    );
    final cards = response['data'];
    if (cards is! List) throw Exception('Invalid card search response.');
    return cards.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  static Future<Map<String, dynamic>> singleProbability({
    required int deckSize,
    required int targetCopies,
    required int drawSize,
    required int minDesired,
  }) async {
    final result = await _request('POST', '/calc/single', body: {
      'deckSize': deckSize,
      'targetCopies': targetCopies,
      'drawSize': drawSize,
      'minDesired': minDesired,
    });
    return Map<String, dynamic>.from(result['data'] as Map);
  }

  static Future<Map<String, dynamic>> comboProbability({
    required int deckSize,
    required int copiesA,
    required int copiesB,
    required int drawSize,
    required int minA,
    required int minB,
  }) async {
    final result = await _request('POST', '/calc/combo', body: {
      'deckSize': deckSize,
      'copiesA': copiesA,
      'copiesB': copiesB,
      'drawSize': drawSize,
      'minA': minA,
      'minB': minB,
    });
    return Map<String, dynamic>.from(result['data'] as Map);
  }
}
