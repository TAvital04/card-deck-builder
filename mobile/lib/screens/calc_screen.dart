import 'package:flutter/material.dart';

import '../services/api_service.dart';

class CalcScreen extends StatefulWidget {
  const CalcScreen({super.key});

  @override
  State<CalcScreen> createState() => _CalcScreenState();
}

class _CalcScreenState extends State<CalcScreen> {
  final deckSize = TextEditingController(text: '40');
  final copiesA = TextEditingController(text: '3');
  final copiesB = TextEditingController(text: '3');
  final handSize = TextEditingController(text: '5');
  final minA = TextEditingController(text: '1');
  final minB = TextEditingController(text: '1');
  bool combo = false;
  bool loading = false;
  bool loadedArgs = false;
  Map<String, dynamic>? result;
  String? error;
  String? selectedCard;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (loadedArgs) return;
    loadedArgs = true;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      final size = args['deckSize'];
      final copies = args['targetCopies'];
      if (size is int && size > 0) deckSize.text = '$size';
      if (copies is int && copies > 0) copiesA.text = '$copies';
      if (args['cardName'] is String) selectedCard = args['cardName'] as String;
    }
  }

  @override
  void dispose() {
    deckSize.dispose();
    copiesA.dispose();
    copiesB.dispose();
    handSize.dispose();
    minA.dispose();
    minB.dispose();
    super.dispose();
  }

  Future<void> calculate() async {
    final n = int.tryParse(deckSize.text);
    final a = int.tryParse(copiesA.text);
    final b = int.tryParse(copiesB.text);
    final draw = int.tryParse(handSize.text);
    final desiredA = int.tryParse(minA.text);
    final desiredB = int.tryParse(minB.text);

    if (n == null || a == null || draw == null || desiredA == null ||
        n <= 0 || a < 0 || a > n || draw <= 0 || draw > n || desiredA <= 0 ||
        (combo && (b == null || desiredB == null || b < 0 ||
            desiredB <= 0 || a + b > n))) {
      setState(() {
        error = 'Enter valid whole numbers. Copies cannot exceed deck size, and hand size must be between 1 and deck size.';
        result = null;
      });
      return;
    }

    setState(() { loading = true; result = null; error = null; });
    try {
      final response = combo
          ? await ApiService.comboProbability(
              deckSize: n, copiesA: a, copiesB: b!, drawSize: draw,
              minA: desiredA, minB: desiredB!,
            )
          : await ApiService.singleProbability(
              deckSize: n, targetCopies: a, drawSize: draw,
              minDesired: desiredA,
            );
      if (mounted) setState(() => result = response);
    } catch (caught) {
      if (mounted) setState(() => error = caught.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget numberField(String label, TextEditingController controller) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label),
    );
  }

  String asPercent(dynamic value) {
    if (value is num) return '${value.toStringAsFixed(2)}%';
    return '--';
  }

  Widget resultContent() {
    final data = result;
    if (data == null) return const SizedBox.shrink();
    final probability = combo ? data['percentage'] : data['atLeastDesiredPct'];
    final distribution = data['distribution'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(combo ? 'Chance of drawing both card types'
                : 'Chance of drawing at least ${minA.text} copy/copies',
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(asPercent(probability),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary)),
            if (!combo) ...[
              const SizedBox(height: 8),
              Text('Exactly ${minA.text}: ${asPercent(data['exactDesiredPct'])}'),
              Text('Zero copies: ${asPercent(data['zeroCopiesPct'])}'),
            ],
            if (!combo && distribution is List) ...[
              const SizedBox(height: 16),
              const Text('Opening hand distribution',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              for (final entry in distribution)
                if (entry is Map) Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    SizedBox(width: 74, child: Text('${entry['copies']} copies')),
                    Expanded(child: LinearProgressIndicator(
                      value: ((entry['probability'] as num?)?.toDouble() ?? 0)
                          .clamp(0.0, 1.0).toDouble(),
                      minHeight: 8,
                    )),
                    const SizedBox(width: 12),
                    SizedBox(width: 65, child: Text(asPercent(entry['percentage']),
                      textAlign: TextAlign.end)),
                  ]),
                ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Probability Calculator')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Exact opening-hand probabilities',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (selectedCard != null) Text('Selected card: $selectedCard'),
            const SizedBox(height: 16),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Single card')),
                ButtonSegment(value: true, label: Text('Two-card combo')),
              ],
              selected: {combo},
              onSelectionChanged: (value) => setState(() {
                combo = value.first;
                result = null;
                error = null;
              }),
            ),
            const SizedBox(height: 16),
            numberField('Total cards in deck', deckSize),
            const SizedBox(height: 12),
            numberField('Starting hand size', handSize),
            const SizedBox(height: 12),
            numberField(combo ? 'Copies of card A' : 'Copies of target card', copiesA),
            const SizedBox(height: 12),
            numberField(combo ? 'Minimum copies of A' : 'Minimum copies wanted', minA),
            if (combo) ...[
              const SizedBox(height: 12),
              numberField('Copies of card B', copiesB),
              const SizedBox(height: 12),
              numberField('Minimum copies of B', minB),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: loading ? null : calculate,
              icon: const Icon(Icons.calculate),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('Calculate'),
              ),
            ),
            if (loading) const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Center(child: CircularProgressIndicator()),
            ),
            if (error != null) Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
            const SizedBox(height: 16),
            resultContent(),
          ],
        ),
      ),
    );
  }
}
