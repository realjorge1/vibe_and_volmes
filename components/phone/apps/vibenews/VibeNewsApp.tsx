import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NpcAccount, SocialPost, TrendingTopic } from '../../../../types/social';
import type { RealCategory } from '../../../../types/realworld';
import { realTopicsNow } from '../../../../systems/realworld/refresh';
import { openLink } from '../../../../systems/realworld/openLink';
import type { PhoneNotification } from '../../../../types/notifications';
import { useSocialStore } from '../../../../store/socialStore';
import { usePlayerStore } from '../../../../store/playerStore';
import { useMusicStore } from '../../../../store/musicStore';
import { findPost } from '../../../../systems/social/postLookup';
import { newsPhoto } from '../../../../systems/visuals/scenes';
import { pickPhoto } from '../../../../systems/visuals/photoIndex';
import { genreLabel } from '../../../../utils/formatters';
import { newsArticle } from '../../../../systems/social/everyday';
import { celebArticle } from '../../../../systems/social/celebFeed';
import { reusable } from '../../../../systems/social/protect';
import { T } from '../../T';
import { ExitButton, PhoneApp } from '../../PhoneApp';
import { AppNav, type NavTab } from '../../AppNav';
import { Avatar } from '../../Avatar';
import { PageLayer } from '../../Page';
import { Photo } from '../../../visuals/Photo';
import { countShort } from '../../bits';
import { useNotificationTarget, usePages, usePlatformFeed, useThread, useToggleSet, useWeek, type AppProps } from '../../hooks';
import { NPC_ACCOUNTS } from '../../../../data/social/npcAccounts';
import { TREND_KIND, hashOf } from '../../kit';

/** Google News' light Material palette. */
const N = {
  bg: '#FFFFFF',
  text: '#1F1F1F',
  sub: '#444746',
  muted: '#5E5E5E',
  line: '#E1E3E1',
  blue: '#0B57D0',
  chip: '#E9EEF6',
  nav: '#F3F6FC',
  pill: '#D3E3FD',
  red: '#E3294A',
};

type Tab = 'foryou' | 'headlines' | 'following' | 'newsstand';
type Page = { kind: 'article'; post: SocialPost } | { kind: 'topic'; trend: TrendingTopic } | { kind: 'source'; account: NpcAccount };

interface Acts {
  week: number;
  saved: ReadonlySet<string>;
  save: (id: string) => void;
  open: (post: SocialPost) => void;
  source: (account: NpcAccount) => void;
}

/** "2 hours ago", on the device clock. */
function ago(post: SocialPost, week: number): string {
  // A real story: its real age.
  if (post.world && post.world.at > 0 && !post.world.evergreen) {
    const mins = Math.max(1, Math.round((Date.now() - post.world.at) / 60_000));
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const diff = week - post.week;
  const h = diff <= 0 ? (hashOf(post.id) % 22) + 1 : diff * 168;
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** A news-voice headline: the post's words, minus the social-media tics. */
function headline(post: SocialPost): string {
  return post.content.replace(/^BREAKING:\s*/i, '').replace(/\s*[📈🔥👀😭💀]+\s*$/u, '');
}

/**
 * VibeNews: the news app, built like Google News. Your briefing, the top
 * story clusters with Full coverage, Headlines by section, the topics you
 * follow, and every outlet in the Newsstand.
 */
export function VibeNewsApp({ origin, notifId }: AppProps) {
  const pages = usePages<Page>();
  const [tab, setTab] = useState<Tab>('foryou');
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(['foryou']));
  const saved = useToggleSet();
  const { data, loadMore } = usePlatformFeed('vibestream');
  const trending = useSocialStore((s) => s.trending);
  const week = useWeek();

  const go = useCallback(
    (t: Tab) => {
      setTab(t);
      setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
      pages.home();
    },
    [pages]
  );

  useNotificationTarget('vibestream', notifId, (n: PhoneNotification) => {
    const t = n.target;
    if (t.kind === 'post' || t.kind === 'comments') {
      const post = findPost(t.postId) ?? n.post;
      if (post) {
        pages.home();
        pages.push({ kind: 'article', post });
      }
    }
  });

  const acts: Acts = {
    week,
    saved: saved.set,
    save: saved.toggle,
    open: (post) => pages.push({ kind: 'article', post }),
    source: (account) => pages.push({ kind: 'source', account }),
  };

  const tabs: NavTab<Tab>[] = [
    { key: 'foryou', icon: 'home', label: 'For you' },
    { key: 'headlines', icon: 'globe', label: 'Headlines' },
    { key: 'following', icon: 'star', label: 'Following' },
    { key: 'newsstand', icon: 'apps', label: 'Newsstand' },
  ];

  return (
    <PhoneApp origin={origin} background={N.bg} statusBar="dark" baseColor={N.nav} indicatorColor="#1F1F1F" onBack={pages.back}>
      <View style={styles.fill}>
        {opened.has('foryou') ? (
          <View style={[styles.fill, tab !== 'foryou' && styles.hidden]}>
            <ForYou data={data} acts={acts} onEnd={loadMore} />
          </View>
        ) : null}
        {opened.has('headlines') ? (
          <View style={[styles.fill, tab !== 'headlines' && styles.hidden]}>
            <Headlines data={data} acts={acts} />
          </View>
        ) : null}
        {opened.has('following') ? (
          <View style={[styles.fill, tab !== 'following' && styles.hidden]}>
            <Following trending={trending} data={data} acts={acts} onTopic={(trend) => pages.push({ kind: 'topic', trend })} />
          </View>
        ) : null}
        {opened.has('newsstand') ? (
          <View style={[styles.fill, tab !== 'newsstand' && styles.hidden]}>
            <Newsstand acts={acts} />
          </View>
        ) : null}

        {pages.stack.map((page, i) => (
          <PageLayer key={i} background={N.bg}>
            {page.kind === 'article' ? (
              <Article post={page.post} data={data} acts={acts} onBack={pages.back} />
            ) : page.kind === 'topic' ? (
              <Topic trend={page.trend} data={data} acts={acts} onBack={pages.back} />
            ) : (
              <Source account={page.account} data={data} acts={acts} onBack={pages.back} />
            )}
          </PageLayer>
        ))}
      </View>
      <AppNav tabs={tabs} value={tab} onChange={go} background={N.nav} active={N.text} inactive={N.sub} variant="material" pillColor={N.pill} iconSize={22} />
    </PhoneApp>
  );
}

function TopBar() {
  const insets = useSafeAreaInsets();
  const name = usePlayerStore((s) => s.player?.artistName ?? 'You');
  return (
    <View style={[styles.topBar, { paddingTop: insets.top }]}>
      <View style={styles.topSide}>
        <ExitButton color={N.text} />
        <Ionicons name="search" size={23} color={N.sub} />
      </View>
      <T size={21} weight="500" color={N.text}>
        <T size={21} weight="700" color={N.red}>
          Vibe
        </T>
        News
      </T>
      <View style={[styles.topSide, styles.topEnd]}>
        <Avatar id="player" name={name} size={32} />
      </View>
    </View>
  );
}

function Publisher({ post, onPress }: { post: SocialPost; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.publisher}>
      <Avatar id={post.account.id} name={post.account.username} size={18} shape="rounded" />
      <T size={13} weight="500" color={N.sub} numberOfLines={1}>
        {post.account.username}
      </T>
    </Pressable>
  );
}

function Cluster({ lead, related, acts }: { lead: SocialPost; related: SocialPost[]; acts: Acts }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.cluster}>
      <Pressable onPress={() => acts.open(lead)}>
        <Photo photo={newsPhoto(lead)} style={[styles.hero, { height: (width - 32) * 0.56 }]} />
        <Publisher post={lead} onPress={() => acts.source(lead.account)} />
        <T size={20} weight="500" color={N.text} lh={26} style={styles.leadText}>
          {headline(lead)}
        </T>
        <View style={styles.metaRow}>
          <T size={12} color={N.muted}>
            {ago(lead, acts.week)}
          </T>
          <Ionicons name="ellipsis-vertical" size={16} color={N.muted} />
        </View>
      </Pressable>
      {related.map((p) => (
        <Pressable key={p.id} onPress={() => acts.open(p)} style={styles.related}>
          <View style={styles.flex}>
            <Publisher post={p} />
            <T size={16} weight="500" color={N.text} lh={22} numberOfLines={3} style={styles.relatedText}>
              {headline(p)}
            </T>
            <T size={12} color={N.muted}>
              {ago(p, acts.week)}
            </T>
          </View>
          <Photo photo={newsPhoto(p, 'any')} style={styles.thumb} />
        </Pressable>
      ))}
      <View style={styles.coverage}>
        <MaterialCommunityIcons name="newspaper-variant-multiple-outline" size={17} color={N.blue} />
        <T size={14} weight="500" color={N.blue}>
          Full coverage
        </T>
      </View>
    </View>
  );
}

function ForYou({ data, acts, onEnd }: { data: SocialPost[]; acts: Acts; onEnd: () => void }) {
  const clusters = useMemo(() => {
    const out: { lead: SocialPost; related: SocialPost[] }[] = [];
    for (let i = 0; i + 2 < data.length; i += 3) out.push({ lead: data[i], related: data.slice(i + 1, i + 3) });
    return out;
  }, [data]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const city = usePlayerStore((s) => s.player?.city ?? '');
  const temp = 14 + (hashOf(today) % 16);

  return (
    <FlatList
      data={clusters}
      keyExtractor={(c) => c.lead.id}
      renderItem={({ item, index }) => (
        <View>
          {index === 2 ? (
            <SectionHead title="Picks for you" />
          ) : null}
          <Cluster lead={item.lead} related={item.related} acts={acts} />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.divider} />}
      ListHeaderComponent={
        <View>
          <TopBar />
          <View style={styles.briefing}>
            <View style={styles.flex}>
              <T size={24} weight="500" color={N.text}>
                Your briefing
              </T>
              <T size={14} color={N.sub}>
                {today}
              </T>
            </View>
            <View style={styles.weather}>
              <Ionicons name="partly-sunny" size={22} color="#F9AB00" />
              <View>
                <T size={15} weight="500" color={N.text}>
                  {temp}°C
                </T>
                <T size={11} color={N.sub} numberOfLines={1}>
                  {city}
                </T>
              </View>
            </View>
          </View>
          <SectionHead title="Top stories" />
        </View>
      }
      onEndReached={onEnd}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead}>
      <T size={20} weight="500" color={N.blue}>
        {title}
      </T>
      <Ionicons name="chevron-forward" size={20} color={N.blue} />
    </View>
  );
}

function Row({ post, acts }: { post: SocialPost; acts: Acts }) {
  return (
    <Pressable onPress={() => acts.open(post)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <Publisher post={post} />
        <T size={16} weight="500" color={N.text} lh={22} numberOfLines={3} style={styles.relatedText}>
          {headline(post)}
        </T>
        <T size={12} color={N.muted}>
          {ago(post, acts.week)}
        </T>
      </View>
      <Photo photo={newsPhoto(post, 'any')} style={styles.thumb} />
    </Pressable>
  );
}

const SECTIONS = ['Latest', 'Music', 'Sports', 'Technology', 'Science', 'Health', 'Entertainment', 'Business', 'World'] as const;

/** Real stories, by kind. */
const REAL_SECTION: Record<RealCategory, (typeof SECTIONS)[number]> = {
  sports: 'Sports',
  tech: 'Technology',
  gaming: 'Technology',
  science: 'Science',
  space: 'Science',
  health: 'Health',
  luxury: 'Business',
  auto: 'Business',
};

/** Which Headlines section a story belongs in. */
function sectionOf(p: SocialPost): (typeof SECTIONS)[number] {
  if (p.world) return REAL_SECTION[p.world.category];
  if (!p.lane || p.lane === 'celeb') return 'Music';
  switch (p.vibe) {
    case 'news-business':
      return 'Business';
    case 'news-tech':
      return 'Technology';
    case 'news-sports':
      return 'Sports';
    case 'news-health':
      return 'Health';
    case 'news-entertainment':
      return 'Entertainment';
    default:
      return 'World';
  }
}

function Headlines({ data, acts }: { data: SocialPost[]; acts: Acts }) {
  const [section, setSection] = useState(0);
  const shown = useMemo(() => {
    if (section === 0) return data;
    return data.filter((p) => sectionOf(p) === SECTIONS[section]);
  }, [data, section]);
  return (
    <FlatList
      data={shown}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <Row post={item} acts={acts} />}
      ItemSeparatorComponent={() => <View style={styles.divider} />}
      ListHeaderComponent={
        <View>
          <TopBar />
          <T size={24} weight="500" color={N.text} style={styles.pageTitle}>
            Headlines
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {SECTIONS.map((s, i) => (
              <Pressable key={s} onPress={() => setSection(i)} style={[styles.chip, i === section && styles.chipOn]}>
                <T size={14} weight="500" color={i === section ? '#041E49' : N.sub}>
                  {s}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function Following({ trending, data, acts, onTopic }: { trending: TrendingTopic[]; data: SocialPost[]; acts: Acts; onTopic: (t: TrendingTopic) => void }) {
  const [followed, setFollowed] = useState<ReadonlySet<string>>(() => new Set());
  const savedPosts = data.filter((p) => acts.saved.has(p.id));
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TopBar />
      <T size={24} weight="500" color={N.text} style={styles.pageTitle}>
        Following
      </T>
      <T size={16} weight="500" color={N.text} style={styles.subhead}>
        Topics
      </T>
      {trending.length === 0 ? (
        <T size={14} color={N.sub} style={styles.subhead}>
          Topics you follow show up here.
        </T>
      ) : (
        trending.slice(0, 8).map((t) => {
          const on = followed.has(t.hashtag);
          return (
            <Pressable key={t.hashtag} onPress={() => onTopic(t)} style={styles.topicRow}>
              <Photo photo={pickPhoto(['crowd', 'stage', 'press'], `topic:${t.hashtag}`)} style={styles.topicFace} />
              <View style={styles.flex}>
                <T size={16} weight="500" color={N.text} numberOfLines={1}>
                  {t.hashtag.replace(/^#/, '')}
                </T>
                <T size={12} color={N.sub}>
                  {TREND_KIND[t.kind ?? 'ambient']} · {countShort(t.volume)} mentions
                </T>
              </View>
              <Pressable
                onPress={() =>
                  setFollowed((s) => {
                    const n = new Set(s);
                    if (n.has(t.hashtag)) n.delete(t.hashtag);
                    else n.add(t.hashtag);
                    return n;
                  })
                }
                hitSlop={10}
              >
                <Ionicons name={on ? 'star' : 'star-outline'} size={22} color={on ? N.blue : N.sub} />
              </Pressable>
            </Pressable>
          );
        })
      )}
      <T size={16} weight="500" color={N.text} style={styles.subhead}>
        Saved stories
      </T>
      {savedPosts.length === 0 ? (
        <T size={14} color={N.sub} style={styles.subhead}>
          Tap the bookmark on a story to save it for later.
        </T>
      ) : (
        savedPosts.map((p) => <Row key={p.id} post={p} acts={acts} />)
      )}
      <View style={styles.pad} />
    </ScrollView>
  );
}

function Newsstand({ acts }: { acts: Acts }) {
  const { width } = useWindowDimensions();
  const outlets = useMemo(
    () => NPC_ACCOUNTS.filter((a) => a.accountType === 'news' || a.accountType === 'industry' || a.accountType === 'critic' || a.accountType === 'gossip'),
    []
  );
  const cell = (width - 16 * 2 - 12 * 2) / 3;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TopBar />
      <T size={24} weight="500" color={N.text} style={styles.pageTitle}>
        Newsstand
      </T>
      <T size={16} weight="500" color={N.text} style={styles.subhead}>
        Music & entertainment
      </T>
      <View style={styles.stand}>
        {outlets.map((a) => (
          <Pressable key={a.id} onPress={() => acts.source(a)} style={[styles.outlet, { width: cell }]}>
            <View style={[styles.outletCard, { width: cell, height: cell }]}>
              <Avatar id={a.id} name={a.username} size={cell * 0.62} shape="rounded" />
            </View>
            <T size={13} color={N.text} numberOfLines={2} center>
              {a.username}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={styles.pad} />
    </ScrollView>
  );
}

// --- An article ------------------------------------------------------------------

/** The story, written up the way the outlet would. */
function paragraphs(post: SocialPost, artist: string, genre: string, city: string, track: { title: string; peak: number | null } | null): string[] {
  const opener: Record<SocialPost['sentiment'], string> = {
    news: `${artist}, the ${genre} artist out of ${city}, is the story of the week across the music industry.`,
    hype: `${artist} has the internet’s full attention, and the ${genre} world is taking notice.`,
    positive: `Momentum is building around ${artist}, the ${genre} artist from ${city}, and the numbers are starting to back it up.`,
    neutral: `The conversation around ${artist} took another turn this week.`,
    meme: `${artist} has become the internet’s favorite running joke this week, in the way only a breakout artist can.`,
    critical: `Not everyone is convinced by ${artist}, and the criticism is getting louder.`,
    shade: `${artist} is facing pointed questions online, and the replies are not kind.`,
    hostile: `The backlash against ${artist} escalated sharply over the past few days.`,
  };
  const out = [opener[post.sentiment]];
  if (track) {
    out.push(
      track.peak
        ? `${artist}’s latest release, “${track.title}”, peaked at No. ${track.peak} on the charts and has kept them in the conversation since.`
        : `${artist}’s latest release, “${track.title}”, is still finding its audience.`
    );
  }
  out.push(
    `The post that started it has drawn ${countShort(post.views ?? 0)} views and ${countShort(post.shares ?? 0)} shares, and the reaction split along familiar lines: devoted fans on one side, skeptics on the other.`
  );
  out.push(`Representatives for ${artist} did not immediately respond to a request for comment.`);
  return out;
}

function Article({ post, data, acts, onBack }: { post: SocialPost; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  if (post.world?.url) return <RealArticle post={post} data={data} acts={acts} onBack={onBack} />;
  return <GameArticle post={post} data={data} acts={acts} onBack={onBack} />;
}

/** The domain a link goes to ("espn.com"). */
function domainOf(url: string | undefined, fallback: string): string {
  const m = (url ?? '').match(/^https?:\/\/(?:www\.)?([^/?#]+)/i);
  return m && !/news\.google\.com$/i.test(m[1]) ? m[1] : fallback;
}

/**
 * A real story. Like Google News, the article itself lives on the
 * publisher's site: the game shows the headline, where it's from, the rest
 * of the coverage and what people in the game are saying, and opens the
 * real article in the browser. Nothing here is written by the game.
 */
function RealArticle({ post, data, acts, onBack }: { post: SocialPost; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const replies = useThread(post);
  const world = post.world!;
  const topic = useMemo(() => realTopicsNow().find((t) => t.id === world.topicId) ?? null, [world.topicId]);
  const saved = acts.saved.has(post.id);
  const source = world.source || post.account.username;
  const domain = domainOf(world.url, `${source.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`);
  const more = data.filter((p) => p.id !== post.id && p.world).slice(0, 5);
  return (
    <View style={styles.fill}>
      <View style={[styles.articleBar, { paddingTop: insets.top }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={23} color={N.text} />
        </Pressable>
        <View style={styles.flex}>
          <T size={15} weight="500" color={N.text} numberOfLines={1}>
            {source}
          </T>
          <T size={12} color={N.sub} numberOfLines={1}>
            {domain}
          </T>
        </View>
        <Pressable onPress={() => acts.save(post.id)} hitSlop={10}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? N.blue : N.text} />
        </Pressable>
        <Ionicons name="share-social-outline" size={22} color={N.text} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.article}>
        <T size={13} weight="700" color={N.red}>
          {REAL_SECTION[world.category].toUpperCase()}
        </T>
        <T size={27} weight="700" color={N.text} lh={34} style={styles.articleHead}>
          {world.headline}
        </T>
        <View style={styles.byline}>
          <Avatar id={post.account.id} name={source} size={30} shape="rounded" />
          <View style={styles.flex}>
            <T size={13} weight="600" color={N.text}>
              {source}
            </T>
            <T size={12} color={N.sub}>
              {ago(post, acts.week)}
            </T>
          </View>
        </View>
        <Pressable onPress={() => void openLink(world.url)} style={styles.readBtn} accessibilityRole="link">
          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          <T size={15} weight="500" color="#FFFFFF">
            Read the full story at {source}
          </T>
        </Pressable>
        {topic && topic.related.length > 0 ? (
          <>
            <T size={20} weight="500" color={N.text} style={styles.reactTitle}>
              Full coverage
            </T>
            {topic.related.map((h) => (
              <Pressable key={h.url} onPress={() => void openLink(h.url)} style={({ pressed }) => [styles.coverRow, pressed && styles.pressed]}>
                <T size={13} weight="500" color={N.sub} numberOfLines={1}>
                  {h.source}
                </T>
                <T size={16} weight="500" color={N.text} lh={22} numberOfLines={3}>
                  {h.title}
                </T>
              </Pressable>
            ))}
          </>
        ) : null}
        {replies.length > 0 ? (
          <>
            <T size={20} weight="700" color={N.text} style={styles.reactTitle}>
              What people are saying
            </T>
            {replies.slice(0, 4).map((r) => (
              <View key={r.id} style={styles.quote}>
                <T size={17} color={N.text} lh={25}>
                  “{r.content}”
                </T>
                <T size={13} color={N.sub}>
                  — @{r.handle}
                </T>
              </View>
            ))}
          </>
        ) : null}
        {more.length > 0 ? (
          <>
            <T size={20} weight="500" color={N.text} style={styles.reactTitle}>
              More stories
            </T>
            {more.map((p) => (
              <Row key={p.id} post={p} acts={acts} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function GameArticle({ post, data, acts, onBack }: { post: SocialPost; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const replies = useThread(post);
  const player = usePlayerStore((s) => s.player);
  const latest = useMusicStore((s) => s.discography[0] ?? null);
  const feed = useSocialStore((s) => s.feed);
  const embed = useMemo(() => {
    // A post from the same story: about the same artist, the same kind of news, or the player.
    const chirps = feed.filter(
      (p) =>
        p.platform === 'chirper' &&
        reusable(p) &&
        (post.lane === 'celeb' ? p.subject?.id === post.subject?.id : post.lane ? p.lane === 'everyday' && p.vibe === post.vibe : !p.lane)
    );
    return chirps[hashOf(post.id) % Math.max(1, chirps.length)] ?? null;
  }, [feed, post.id, post.lane, post.subject?.id, post.vibe]);
  const saved = acts.saved.has(post.id);
  const artist = player?.artistName ?? 'The artist';
  const body =
    newsArticle(post) ??
    celebArticle(post) ??
    paragraphs(post, artist, player ? genreLabel(player.genre) : 'music', player?.city ?? 'their hometown', latest ? { title: latest.title, peak: latest.peakChartPosition } : null);
  const more = data.filter((p) => p.id !== post.id).slice(0, 4);
  const domain = `${post.account.handle.replace(/_/g, '')}.com`;
  const date = new Date(Date.now() - ((hashOf(post.id) % 22) + 1) * 3_600_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.fill}>
      <View style={[styles.articleBar, { paddingTop: insets.top }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={23} color={N.text} />
        </Pressable>
        <View style={styles.flex}>
          <T size={15} weight="500" color={N.text} numberOfLines={1}>
            {post.account.username}
          </T>
          <T size={12} color={N.sub} numberOfLines={1}>
            {domain}
          </T>
        </View>
        <Pressable onPress={() => acts.save(post.id)} hitSlop={10}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? N.blue : N.text} />
        </Pressable>
        <Ionicons name="share-social-outline" size={22} color={N.text} />
        <Ionicons name="ellipsis-vertical" size={20} color={N.text} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.article}>
        <T size={13} weight="700" color={N.red}>
          {post.sentiment === 'news' ? 'MUSIC' : post.sentiment === 'hostile' || post.sentiment === 'shade' ? 'CONTROVERSY' : 'CULTURE'}
        </T>
        <T size={27} weight="700" color={N.text} lh={34} style={styles.articleHead}>
          {headline(post)}
        </T>
        <View style={styles.byline}>
          <Avatar id={post.account.id} name={post.account.username} size={30} shape="rounded" />
          <View style={styles.flex}>
            <T size={13} weight="600" color={N.text}>
              By {post.account.username} staff
            </T>
            <T size={12} color={N.sub}>
              {date} · {ago(post, acts.week)}
            </T>
          </View>
        </View>
        <Photo photo={newsPhoto(post)} style={[styles.articleArt, { height: (width - 36) * 0.62 }]} />
        <T size={12} color={N.muted} style={styles.credit}>
          Photo: {post.account.username}
        </T>
        <T size={17} color={N.text} lh={27} style={styles.para}>
          {body[0]}
        </T>
        {embed ? <EmbeddedPost post={embed} week={acts.week} /> : null}
        {body.slice(1).map((p, i) => (
          <T key={i} size={17} color={N.text} lh={27} style={styles.para}>
            {p}
          </T>
        ))}
        {replies.length > 0 ? (
          <>
            <T size={20} weight="700" color={N.text} style={styles.reactTitle}>
              What people are saying
            </T>
            {replies.slice(0, 3).map((r) => (
              <View key={r.id} style={styles.quote}>
                <T size={17} color={N.text} lh={25}>
                  “{r.content}”
                </T>
                <T size={13} color={N.sub}>
                  — @{r.handle}
                </T>
              </View>
            ))}
          </>
        ) : null}
        <View style={styles.coverageBtn}>
          <MaterialCommunityIcons name="newspaper-variant-multiple-outline" size={18} color={N.blue} />
          <T size={14} weight="500" color={N.blue}>
            Full coverage of this story
          </T>
        </View>
        <T size={20} weight="500" color={N.text} style={styles.reactTitle}>
          More stories
        </T>
        {more.map((p) => (
          <Row key={p.id} post={p} acts={acts} />
        ))}
      </ScrollView>
    </View>
  );
}

/** A Chirp post embedded in the article, the way news sites embed them. */
function EmbeddedPost({ post, week }: { post: SocialPost; week: number }) {
  const diff = week - post.week;
  const when = new Date(Date.now() - (diff <= 0 ? (hashOf(post.id) % 22) + 1 : diff * 168) * 3_600_000);
  return (
    <View style={styles.embed}>
      <View style={styles.embedHead}>
        <Avatar id={post.account.id} name={post.account.username} size={36} />
        <View style={styles.flex}>
          <T size={14} weight="700" color={N.text} numberOfLines={1}>
            {post.account.username}
          </T>
          <T size={13} color={N.sub}>
            @{post.account.handle}
          </T>
        </View>
        <MaterialCommunityIcons name="bird" size={22} color="#1D9BF0" />
      </View>
      <T size={15} color={N.text} lh={21} style={styles.embedText}>
        {post.content}
      </T>
      <T size={13} color={N.sub}>
        {when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </T>
      <View style={styles.embedStats}>
        <Ionicons name="heart" size={15} color="#F91880" />
        <T size={13} color={N.sub}>
          {countShort(post.likes)}
        </T>
        <Ionicons name="chatbubble-outline" size={14} color={N.sub} />
        <T size={13} color={N.sub}>
          {countShort(post.replies)}
        </T>
      </View>
    </View>
  );
}

function Topic({ trend, data, acts, onBack }: { trend: TrendingTopic; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const posts = useMemo(() => {
    const tone = data.filter((p) => p.sentiment === trend.sentiment);
    return tone.length >= 3 ? tone : data;
  }, [data, trend.sentiment]);
  return (
    <View style={styles.fill}>
      <View style={[styles.articleBar, { paddingTop: insets.top }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={23} color={N.text} />
        </Pressable>
        <T size={18} weight="500" color={N.text} numberOfLines={1} style={styles.flex}>
          {trend.hashtag.replace(/^#/, '')}
        </T>
        <Ionicons name="star-outline" size={22} color={N.text} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Row post={item} acts={acts} />}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Source({ account, data, acts, onBack }: { account: NpcAccount; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const posts = useMemo(() => {
    const own = data.filter((p) => p.account.id === account.id);
    return own.length > 0 ? own : data.slice(0, 6).map((p) => ({ ...p, id: `${p.id}:${account.id}`, account }));
  }, [data, account]);
  return (
    <View style={styles.fill}>
      <View style={[styles.articleBar, { paddingTop: insets.top }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={23} color={N.text} />
        </Pressable>
        <View style={styles.flex} />
        <Ionicons name="star-outline" size={22} color={N.text} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Row post={item} acts={acts} />}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListHeaderComponent={
          <View style={styles.sourceHead}>
            <Avatar id={account.id} name={account.username} size={72} shape="rounded" />
            <T size={24} weight="500" color={N.text}>
              {account.username}
            </T>
            <T size={14} color={N.sub}>
              {countShort(account.followers)} followers
            </T>
            <View style={styles.followBtn}>
              <Ionicons name="star-outline" size={16} color="#FFFFFF" />
              <T size={14} weight="500" color="#FFFFFF">
                Follow
              </T>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: N.bg },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  pressed: { backgroundColor: 'rgba(0,0,0,0.04)' },
  pad: { height: 40 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: N.line, marginHorizontal: 16 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 16, minHeight: 58 },
  topSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  topEnd: { justifyContent: 'flex-end' },
  briefing: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: N.nav, maxWidth: 140 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  pageTitle: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  subhead: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },

  cluster: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  hero: { width: '100%', borderRadius: 16, marginBottom: 10 },
  publisher: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leadText: { marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  related: { flexDirection: 'row', gap: 14, paddingTop: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: N.line },
  relatedText: { marginVertical: 4 },
  thumb: { width: 84, height: 84, borderRadius: 10 },
  coverage: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#C4C7C5' },
  row: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#C4C7C5', justifyContent: 'center' },
  chipOn: { backgroundColor: N.pill, borderColor: N.pill },

  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  topicFace: { width: 48, height: 48, borderRadius: 10 },
  stand: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  outlet: { alignItems: 'center', gap: 6, marginBottom: 6 },
  outletCard: { borderRadius: 16, backgroundColor: N.nav, alignItems: 'center', justifyContent: 'center' },

  articleBar: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: N.line },
  article: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 48 },
  articleHead: { marginTop: 6 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  articleArt: { width: '100%', borderRadius: 12, marginTop: 16 },
  credit: { marginTop: 6 },
  para: { marginTop: 16 },
  embed: { marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: N.line, gap: 8 },
  embedHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  embedText: {},
  embedStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactTitle: { marginTop: 26, marginBottom: 4 },
  quote: { gap: 4, paddingVertical: 10 },
  coverageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#C4C7C5' },
  readBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, height: 46, borderRadius: 23, backgroundColor: N.blue, paddingHorizontal: 18 },
  coverRow: { gap: 4, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: N.line },
  sourceHead: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 18, height: 36, borderRadius: 18, backgroundColor: N.blue },
});
