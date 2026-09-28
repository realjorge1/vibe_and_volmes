import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePressStore } from '../store/pressStore';
import { useGameStore } from '../store/gameStore';
import { useRelationshipStore } from '../store/relationshipStore';
import { enhanceInterviewPrompts } from '../ai';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { ChoiceButton } from '../components/events/ChoiceButton';
import { INTERVIEW_QUESTIONS } from '../data/media/interviewQuestions';
import { answerQuestion } from '../systems/media/mediaEngine';
import { playerResolveInterview } from '../systems/simulation/playerActions';
import { SPACING, COLORS } from '../constants/theme';

export default function InterviewModal() {
  const router = useRouter();
  const session = usePressStore((s) => s.pendingInterview);
  const knownArtists = useRelationshipStore((s) => s.knownArtists);
  const week = useGameStore((s) => s.week);
  const [idx, setIdx] = useState(0);
  const [headline, setHeadline] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // AI decorator: question prompts may be rewritten in-character. The
  // authored prompts (and all answer deltas) stay the deterministic truth;
  // this only swaps surface text, and only if a cloud model added value.
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) return;
    let alive = true;
    enhanceInterviewPrompts(session, week)
      .then((m) => alive && Object.keys(m).length > 0 && setAiPrompts(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session, week]);

  if (!session) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="title" center>
            No interview pending.
          </Text>
          <Button
            label="Back"
            onPress={() => router.back()}
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  const rivalName = knownArtists[0]?.name ?? 'your rival';

  if (done) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="label" muted center>
            THE NEXT DAY
          </Text>
          <Text variant="title" center style={styles.headline}>
            “{headline}”
          </Text>
          <Text variant="body" muted center style={styles.sub}>
            The interview is out there now. It will ripple.
          </Text>
          <Button
            label="Back to Industry"
            onPress={() => router.back()}
            fullWidth
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  const qId = session.questionIds[idx];
  const question = INTERVIEW_QUESTIONS.find((q) => q.id === qId);
  const total = session.questionIds.length;

  if (!question) {
    return (
      <Screen>
        <View style={styles.center}>
          <Button label="Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const prompt = (aiPrompts[qId] ?? question.prompt).replace(
    '{rival}',
    rivalName
  );

  const onAnswer = (answerId: string) => {
    answerQuestion(qId, answerId);
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      const h = playerResolveInterview();
      setHeadline(h ?? 'The interview aired.');
      setDone(true);
    }
  };

  return (
    <Screen scroll>
      <Text variant="label" muted style={styles.counter}>
        {session.outletName.toUpperCase()} · QUESTION {idx + 1} OF {total}
      </Text>

      <Card accent={COLORS.warning}>
        <Text variant="label" muted>
          {question.tone.toUpperCase()}
        </Text>
        <Text variant="heading" style={styles.prompt}>
          {prompt}
        </Text>
      </Card>

      <Text variant="subheading" style={styles.prompt}>
        How do you answer?
      </Text>

      {question.answers.map((a) => (
        <View key={a.id} style={styles.answer}>
          <ChoiceButton text={a.text} onPress={() => onAnswer(a.id)} />
          <Text variant="caption" muted style={styles.flavor}>
            {a.flavor}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { marginTop: SPACING.base, marginBottom: SPACING.md },
  prompt: { marginVertical: SPACING.sm },
  answer: { marginBottom: SPACING.md },
  flavor: { marginTop: SPACING.xs, marginLeft: SPACING.sm },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.base },
  headline: { marginTop: SPACING.md },
  sub: { marginTop: SPACING.md, lineHeight: 22 },
  btn: { marginTop: SPACING.xl },
});
