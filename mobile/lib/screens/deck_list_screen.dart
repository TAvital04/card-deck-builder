import 'package:flutter/material.dart';

import '../services/api_service.dart';

class DeckListScreen extends StatefulWidget {
  const DeckListScreen({super.key});

  @override
  State<DeckListScreen> createState() => _DeckListScreenState();
}

class _DeckListScreenState extends State<DeckListScreen> {
  final searchController = TextEditingController();
  List<Map<String, dynamic>> decks = [];
  List<Map<String, dynamic>> searchResults = [];
  bool loading = true;
  bool searching = false;
  String? error;
  String? searchError;
  bool searchTab = false;
  bool searched = false;

  @override
  void initState() {
    super.initState();
    loadDecks();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  Future<void> loadDecks() async {
    setState(() { loading = true; error = null; });
    try {
      final result = await ApiService.getDecks();
      if (mounted) setState(() => decks = result);
    } catch (caught) {
      if (mounted) setState(() => error = caught.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> searchCards() async {
    final query = searchController.text.trim();
    if (query.isEmpty) {
      setState(() { searchError = 'Enter a card name.'; searched = false; });
      return;
    }
    setState(() { searching = true; searched = false; searchError = null; });
    try {
      final result = await ApiService.searchCards(query);
      if (mounted) setState(() { searchResults = result; searched = true; });
    } catch (caught) {
      if (mounted) setState(() => searchError = caught.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => searching = false);
    }
  }

  Future<void> logout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }

  int totalCards(Map<String, dynamic> deck) {
    final cards = deck['cards'];
    if (cards is! List) return 0;
    return cards.fold<int>(0, (total, card) {
      if (card is! Map) return total;
      final count = card['count'];
      return total + (count is num ? count.toInt() : 0);
    });
  }

  void showDeck(Map<String, dynamic> deck) {
    final rawCards = deck['cards'];
    final cards = rawCards is List ? rawCards.whereType<Map>().toList() : <Map>[];
    final size = totalCards(deck);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: FractionallySizedBox(
          heightFactor: 0.8,
          child: Column(
            children: [
              ListTile(
                title: Text('${deck['name'] ?? 'Untitled deck'}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                subtitle: Text('${deck['game'] ?? 'Card game'} · $size cards'),
                trailing: IconButton(
                  onPressed: () => Navigator.pop(sheetContext),
                  icon: const Icon(Icons.close),
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: cards.isEmpty
                    ? const Center(child: Text('This deck has no cards yet.'))
                    : ListView.builder(
                        itemCount: cards.length,
                        itemBuilder: (context, index) {
                          final card = cards[index];
                          final count = (card['count'] as num?)?.toInt() ?? 0;
                          final name = card['name']?.toString() ?? 'Unknown card';
                          return ListTile(
                            title: Text(name),
                            subtitle: Text([
                              card['category'], card['role'],
                            ].where((value) => value != null && value.toString().isNotEmpty).join(' · ')),
                            leading: CircleAvatar(child: Text('$count')),
                            trailing: const Icon(Icons.calculate_outlined),
                            onTap: () {
                              Navigator.pop(sheetContext);
                              Navigator.pushNamed(context, '/calculator', arguments: {
                                'deckSize': size,
                                'targetCopies': count,
                                'cardName': name,
                              });
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget decksContent() {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(error!, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: loadDecks, child: const Text('Retry')),
        ]),
      ));
    }
    if (decks.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(28),
        child: Text('No saved decks yet. Create one on the web application, then refresh here.',
            textAlign: TextAlign.center),
      ));
    }
    return RefreshIndicator(
      onRefresh: loadDecks,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: decks.length,
        itemBuilder: (context, index) {
          final deck = decks[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const Icon(Icons.style_outlined),
              title: Text(deck['name']?.toString() ?? 'Untitled deck'),
              subtitle: Text('${deck['game'] ?? 'Unknown game'} · ${totalCards(deck)} cards'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => showDeck(deck),
            ),
          );
        },
      ),
    );
  }

  Widget searchContent() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            controller: searchController,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => searchCards(),
            decoration: InputDecoration(
              labelText: 'Search the card catalog',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: 'Search',
                onPressed: searching ? null : searchCards,
                icon: const Icon(Icons.arrow_forward),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (searching) const LinearProgressIndicator(),
          if (searchError != null)
            Padding(padding: const EdgeInsets.all(12), child: Text(searchError!)),
          if (searched && searchResults.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text('No cards found in the server catalog. The catalog may not be populated yet.',
                  textAlign: TextAlign.center),
            ),
          Expanded(
            child: ListView.builder(
              itemCount: searchResults.length,
              itemBuilder: (context, index) {
                final card = searchResults[index];
                return ListTile(
                  leading: const Icon(Icons.style),
                  title: Text(card['name']?.toString() ?? 'Unnamed card'),
                  subtitle: Text([
                    card['game'], card['category'], card['role'],
                  ].where((value) => value != null && value.toString().isNotEmpty).join(' · ')),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(searchTab ? 'Card Search' : 'My Decks'),
        actions: [
          IconButton(
            tooltip: 'Calculator',
            icon: const Icon(Icons.calculate_outlined),
            onPressed: () => Navigator.pushNamed(context, '/calculator'),
          ),
          if (!searchTab) IconButton(
            tooltip: 'Refresh decks',
            icon: const Icon(Icons.refresh),
            onPressed: loading ? null : loadDecks,
          ),
          IconButton(tooltip: 'Log out', icon: const Icon(Icons.logout), onPressed: logout),
        ],
      ),
      body: searchTab ? searchContent() : decksContent(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: searchTab ? 1 : 0,
        onDestinationSelected: (index) => setState(() => searchTab = index == 1),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.style_outlined), label: 'My Decks'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Card Search'),
        ],
      ),
    );
  }
}
