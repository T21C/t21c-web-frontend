import { routes } from '@/api/routes';
// tuf-search: #ProfilePage #profilePage #account #profile — {{name}}
import "../accountProfilePage.css"
import "./profilePage.css"
import api from "@/utils/api";
import axios from "axios";
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom"
import { formatNumber } from "@/utils";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { MetaTags } from "@/components/common/display";
import { buildPlayerMeta } from '@/utils/meta';
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPlayerPopup } from "@/components/popups/Users";
import { ShieldIcon, EditIcon, PackIcon } from "@/components/common/icons";
import caseOpen from "@/assets/icons/case.png";
import { CaseOpenSelector } from "@/components/common/selectors";
import { useScrollParent } from "@/components/common/VirtualList";
import { ScrollButton } from "@/components/common/buttons";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useDebouncedRequest } from "@/hooks/useDebouncedRequest";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";
import { AccountStatusBanners } from "@/components/account/AccountStatusBanners/AccountStatusBanners";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import ProfileFollowButton from "@/components/account/ProfileFollowButton/ProfileFollowButton";
import { TournamentPlacementsSection } from "@/components/account/TournamentPlacements";
import {
  ProfileModulesRenderer,
  PlayerBioModule,
  PlayerScoreBreakdownModule,
  PlayerDifficultyModule,
  PlayerRankHistoryModule,
  PlayerScoresModule,
  FavoriteShowcase,
} from "@/components/account/ProfileModules";

import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { normalizePassSearchQuery } from '@/utils/normalizeEntitySearchQuery';
import { buildPlayerIconSlots, pguNumberToQTier } from "@/utils/profileIconSlots";
import { toDifficultyGraphData } from "@/utils/statFormatters";
import {
  getEffectiveProfileBannerUrl,
  getEffectiveProfileHeaderSurface,
  isTufStellarAccessActive,
  normalizeTufStellarIconVariant,
} from "@/utils/profileBanners";
import { userAvatarDisplayUrl } from "@/utils/playerAvatarDisplay";
import { normalizeProfileAliasNames } from "@/utils/profileAliasNames";
import { formatDateShort } from "@/utils/Utility";
import i18next from 'i18next';
const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

function utcYmd(d) {
  return d.toISOString().slice(0, 10);
}

function computeRankHistoryFromTo(rangeKey, createdAtIso) {
  if (rangeKey === "all") {
    return null;
  }
  const to = utcYmd(new Date());
  const tMs = Date.now();
  const created =
    typeof createdAtIso === "string" && createdAtIso.length >= 10
      ? createdAtIso.slice(0, 10)
      : "2020-01-01";
  let from;
  if (rangeKey === "30d") from = utcYmd(new Date(tMs - 30 * 86400000));
  else if (rangeKey === "90d") from = utcYmd(new Date(tMs - 90 * 86400000));
  else if (rangeKey === "365d") from = utcYmd(new Date(tMs - 365 * 86400000));
  else from = created <= to ? created : to;
  if (from > to) return { from: to, to };
  return { from, to };
}

/** Whole UTC calendar days between date-only `YYYY-MM-DD` and today UTC (start of day). Null if invalid. */
function utcWholeDaysAgo(isoDateOnly) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(isoDateOnly).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const pointMs = Date.UTC(y, mo, d);
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((todayMs - pointMs) / 86400000);
}

const PASSES_PER_PAGE = 50;

const ProfilePage = () => {
    const params = useParams()
    let playerId = params.playerId
    const [playerData, setPlayerData] = useState(null)
    const [showCaseOpen, setShowCaseOpen] = useState(false);
    const { t } = useTranslation('pages');
    const { user, loading: authLoading } = useAuth();
    const [showEditPopup, setShowEditPopup] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const playerMeta = useMemo(() => {
      const resolvedId = playerId || playerData?.id;
      return buildPlayerMeta(playerData || null, t, {
        pathname: location.pathname,
        playerId: resolvedId,
        avatarUrl: playerData ? userAvatarDisplayUrl(playerData) : undefined,
      });
    }, [playerId, playerData, t, location.pathname]);
    const [isSpinning, setIsSpinning] = useState(false);

    // Server-paginated passes (infinite scroll).
    const [displayedPasses, setDisplayedPasses] = useState([]);
    const [passesTotal, setPassesTotal] = useState(0);
    const [passesInitialLoading, setPassesInitialLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showHiddenPasses, setShowHiddenPasses] = useState(false);
    const [hideReclears, setHideReclears] = useState(false);
    const [bioCollapsed, setBioCollapsed] = useState(false);
    const [scoresCollapsed, setScoresCollapsed] = useState(false);
    const [scoreBreakdownCollapsed, setScoreBreakdownCollapsed] = useState(false);
    const [difficultyCollapsed, setDifficultyCollapsed] = useState(false);
    const [includeDupes, setIncludeDupes] = useState(false);
    const runPassesRequest = useDebouncedRequest(350);
    // Guard against stale responses when filters change mid-flight.
    const passesRequestIdRef = useRef(0);
    const { scrollRef: scoresScrollRef, scrollParent: scoresScrollParent } = useScrollParent();

    const [rankHistoryCollapsed, setRankHistoryCollapsed] = useState(false);
    const [favoriteCollapsed, setFavoriteCollapsed] = useState(false);
    const [rankHistoryMetric, setRankHistoryMetric] = useState("rankedScore");
    const [rankHistoryRange, setRankHistoryRange] = useState("365d");
    const [rankHistorySeries, setRankHistorySeries] = useState([]);
    const [rankHistoryLoading, setRankHistoryLoading] = useState(false);
    const [rankHistoryError, setRankHistoryError] = useState(null);

    const isOwnProfile = !playerId || Number(playerId) === user?.playerId;

    if (!playerId) {
      playerId = user?.playerId;
    }

    useEffect(() => {
      const urlPlayerId = params.playerId;
      if (!urlPlayerId && user?.playerId) {
        navigate(`/profile/${user.playerId}`, { replace: true });
      }
    }, [params.playerId, user?.playerId, navigate]);
    
    // Get context for search and sort state (per player)
    const profileContext = useProfileContext();
    const { difficultyDict, difficulties } = useDifficultyContext();
    const currentSettings = profileContext.getPlayerSettings(playerId);
    
    const searchQuery = currentSettings.searchQuery;
    const sortType = currentSettings.sortType || 'score';
    const sortOrder = currentSettings.sortOrder || 'DESC';
    
    const setSearchQuery = (query) => profileContext.setSearchQuery(playerId, query);
    const setSortType = (type) => profileContext.setSortType(playerId, type);
    const setSortOrder = (order) => profileContext.setSortOrder(playerId, order);

    var valueLabels = {
      rankedScore: t('profile.valueLabels.rankedScore'),
      generalScore: t('profile.valueLabels.generalScore'),
      totalScoreV2: t('profile.valueLabels.totalScoreV2'),
      ppScore: t('profile.valueLabels.ppScore'),
      wfScore: t('profile.valueLabels.wfScore'),
      wfPPScore: t('profile.valueLabels.wfPPScore'),
      score12K: t('profile.valueLabels.score12K'),
      averageXacc: t('profile.valueLabels.averageXacc'),
      worldsFirstCount: t('profile.valueLabels.worldsFirstCount'),
      worldsFirstPPCount: t('profile.valueLabels.worldsFirstPPCount'),
    };

    useEffect(() => {
        const id =
          playerId != null && playerId !== ''
            ? Number(playerId)
            : NaN;
        if (!Number.isFinite(id) || id <= 0) {
          return;
        }
        const fetchPlayer = async () => {
          try {
            const qs =
              isOwnProfile && showHiddenPasses
                ? '?showHidden=true'
                : '';
            const response = await api.get(
              `${routes.playersV3.root()}/${id}/profile${qs}`,
            );
            setPlayerData(response.data);

          } catch (error) {
            console.error('Error fetching player data:', error);
          }
        };

        fetchPlayer();
      }, [playerId, isOwnProfile, showHiddenPasses]);

      // Passes are served from a paginated endpoint so we only fetch what is
      // visible. Sorting and searching happen server-side; the infinite
      // scroll handler below pulls the next page as the user scrolls.
      const fetchPassesPage = async (offset, { immediate = false } = {}) => {
        if (!playerId) return;
        const params = new URLSearchParams({
          limit: String(PASSES_PER_PAGE),
          offset: String(offset),
          sortBy: sortType,
          order: sortOrder,
        });
        if (searchQuery) params.append('query', searchQuery);
        if (isOwnProfile && showHiddenPasses) params.append('showHidden', 'true');
        if (hideReclears) params.append('bestPerLevel', 'true');

        const url = `${routes.playersV3.root()}/${playerId}/passes?${params.toString()}`;
        const requestId = ++passesRequestIdRef.current;
        const runner = immediate ? runPassesRequest.flush : runPassesRequest;
        if (offset === 0) setPassesInitialLoading(true);
        try {
          const response = await runner(({ signal }) => api.get(url, { signal }));
          if (requestId !== passesRequestIdRef.current) return;
          const results = Array.isArray(response.data?.passes) ? response.data.passes : [];
          const total = Number(response.data?.total) || 0;
          setPassesTotal(total);
          if (offset === 0) {
            setDisplayedPasses(results);
          } else {
            setDisplayedPasses(prev => [...prev, ...results]);
          }
          setHasMore((offset + results.length) < total);
        } catch (error) {
          if (axios.isCancel(error)) return;
          console.error('Error fetching player passes:', error);
          if (requestId === passesRequestIdRef.current && offset === 0) {
            setDisplayedPasses([]);
            setPassesTotal(0);
            setHasMore(false);
          }
        } finally {
          if (requestId === passesRequestIdRef.current && offset === 0) {
            setPassesInitialLoading(false);
          }
        }
      };

      useEffect(() => {
        if (!playerId) {
          setDisplayedPasses([]);
          setPassesTotal(0);
          setHasMore(false);
          return;
        }
        // Reset the list when filter inputs change; fetch the first page.
        setDisplayedPasses([]);
        setHasMore(true);
        fetchPassesPage(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [playerId, searchQuery, sortType, sortOrder, showHiddenPasses, hideReclears]);

      const handlePlayerUpdate = (updatedPlayer) => {
        setPlayerData(updatedPlayer);
      };

      const handleAdminEditClick = () => {
        if (!playerData) {
          console.error('No player data available');
          return;
        }
        setShowEditPopup(true);
      };

      const handleCreatorUserLinkedUpdate = () => {
        if (isOwnProfile && user) {
          window.dispatchEvent(new CustomEvent('auth:permission-changed'));
        }
      };

      const handleSearchForOther = () => {
        navigate('/leaderboard');
      }

      const handleCaseOpenClick = () => {
        setShowCaseOpen(true);
      };

      const handleCaseOpenClose = () => {
        setShowCaseOpen(false);
      };

      const handleViewUserPacks = () => {
        const handle = playerData?.user?.username;
        if (handle) {
          navigate('/packs', {
            state: { packSearchQuery: `owner:${handle}` },
          });
        }
      };

      /*
      const handleDiscordRoleRefresh = async () => {
        try {
          // Determine which user ID to sync
          let targetUserId;
          let response;
          
          if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
            // Super admin can sync any user's roles
            if (!playerData?.user?.id) {
              toast.error(t('profile.discordRoleSync.errors.noUser'));
              return;
            }
            targetUserId = playerData.user.id;
            response = await api.post(routes.admin.discord.syncUser(targetUserId));
          } else {
            // Non-admin users can only sync their own roles
            if (!user?.id) {
              toast.error(t('profile.discordRoleSync.errors.noUser'));
              return;
            }
            targetUserId = user.id;
            response = await api.post(routes.auth.profile.syncRoles());
          }


          if (response.data?.success) {
            toast.success(
              hasFlag(user, permissionFlags.SUPER_ADMIN) 
                ? t('profile.discordRoleSync.success.other')
                : t('profile.discordRoleSync.success.own')
            );
          }
          else {
            toast.error(t('profile.discordRoleSync.errors.generic'));
          }
        } catch (error) {
          
          if (error.response?.status === 429 && error.response?.data?.retryAfter) {
            // Format retryAfter (which is in ms) into MM:SS
            const retryAfterMs = error.response?.data?.retryAfter;
            let retryAfterFormatted = retryAfterMs;
            if (typeof retryAfterMs === 'number' && !isNaN(retryAfterMs) && retryAfterMs > 0) {
              const totalSeconds = Math.ceil(retryAfterMs / 1000);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              retryAfterFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            toast.error(t('profile.discordRoleSync.errors.tooManyRequests', { retryAfter: retryAfterFormatted }));
          } else {
            const errorMessage = error.response?.data?.error || error.message || t('profile.discordRoleSync.errors.generic');
            toast.error(errorMessage);
          }
        }
      };
      */

      const lowestImpactScore = playerData?.topScores?.reduce((minItem, score) =>
        minItem == null || score.impact < minItem.impact ? score : minItem
      , null);

      // Sort options are pure labels now — ordering is resolved server-side.
      const sortOptions = useMemo(() => [
        { value: 'score', label: t('profile.sort.byScore') },
        { value: 'impact', label: t('profile.sort.byImpact') },
        { value: 'speed', label: t('profile.sort.bySpeed') },
        { value: 'date', label: t('profile.sort.byDate') },
        { value: 'xacc', label: t('profile.sort.byXacc') },
        { value: 'difficulty', label: t('profile.sort.byDifficulty') },
      ], [t]);

      const selectedSortOption = useMemo(
        () => sortOptions.find(option => option.value === sortType),
        [sortOptions, sortType]
      );

      const statGroups = useMemo(
        () => buildPlayerStatGroups(playerData?.funFacts, t, difficultyDict || {}, playerData),
        [playerData, t, difficultyDict],
      );

      const scoreBreakdownTiles = useMemo(() => {
        if (!playerData) return [];
        const fields = [
          { key: "rankedScore" },
          { key: "totalScoreV2" },
          { key: "generalScore" },
          { key: "ppScore" },
          { key: "wfScore" },
          { key: "wfPPScore" },
          { key: "score12K" },
          { key: "averageXacc", isXacc: true },
        ];
        return fields.map((field) => {
          const raw = playerData[field.key];
          let value;
          if (field.isXacc) {
            value = formatAccuracyRatio(Number(raw) || 0);
          } else {
            value = formatNumber(Number(raw) || 0);
          }
          return {
            key: field.key,
            label: valueLabels[field.key] ?? field.key,
            value,
          };
        });
      }, [playerData, valueLabels]);

      const clearsByDifficultyForHeader =
        playerData?.funFacts?.clearsByDifficultyNoDupes ?? playerData?.funFacts?.clearsByDifficulty;

      /**
       * Derive "Q difficulty" counts (GQ0..4 / UQ0..4) from worlds-first passes on G1..20 / U1..20
       * only — same tier bucketing as icon slots; non-WF clears do not contribute to Q.
       * Merged into the panel clears map so SPECIAL Q rows light from WF aggregates.
       */
      const difficultyPanelClearsByDifficulty = useMemo(() => {
        const clears =
          clearsByDifficultyForHeader && typeof clearsByDifficultyForHeader === "object"
            ? clearsByDifficultyForHeader
            : {};
        const wfs =
          playerData?.funFacts?.worldsFirstByDifficulty &&
          typeof playerData.funFacts.worldsFirstByDifficulty === "object"
            ? playerData.funFacts.worldsFirstByDifficulty
            : {};
        const dict = difficultyDict && typeof difficultyDict === "object" ? difficultyDict : {};

        /** @type {Record<"G"|"U", Record<number, number | string>>} */
        const qIdByTier = { G: {}, U: {} };
        for (const d of Object.values(dict)) {
          const nm = d?.name;
          const id = d?.id;
          if (id == null || typeof nm !== "string") continue;
          const m = nm.match(/(GQ|UQ)([0-4])/);
          if (!m) continue;
          const letter = m[1][0]; // "G" | "U"
          const tier = Number(m[2]);
          if ((letter !== "G" && letter !== "U") || !Number.isFinite(tier)) continue;
          if (qIdByTier[letter][tier] == null) {
            qIdByTier[letter][tier] = id;
          }
        }

        /** @type {Record<string, number>} */
        const qDerived = {};
        const pguRegex = /^([PGUpgu])(\d{1,2})$/;

        for (const [diffIdKey, rawWf] of Object.entries(wfs)) {
          const wfCount = Number(rawWf) || 0;
          if (wfCount <= 0) continue;
          const name = dict?.[diffIdKey]?.name ?? dict?.[String(diffIdKey)]?.name;
          if (typeof name !== "string") continue;
          const m = name.trim().match(pguRegex);
          if (!m) continue;
          const letter = String(m[1]).toUpperCase();
          if (letter !== "G" && letter !== "U") continue;
          const n = parseInt(m[2], 10);
          const tier = pguNumberToQTier(n);
          if (tier == null) continue;
          const qId = qIdByTier[letter]?.[tier];
          if (qId == null) continue;
          const k = String(qId);
          qDerived[k] = (Number(qDerived[k]) || 0) + wfCount;
        }

        return { ...clears, ...qDerived };
      }, [clearsByDifficultyForHeader, difficultyDict, playerData?.funFacts?.worldsFirstByDifficulty]);

      const iconSlots = useMemo(
        () => buildPlayerIconSlots(
          {
            clearsByDifficulty: clearsByDifficultyForHeader,
            worldsFirstByDifficulty: playerData?.funFacts?.worldsFirstByDifficulty,
          },
          difficultyDict || {},
        ),
        [
          clearsByDifficultyForHeader,
          playerData?.funFacts?.worldsFirstByDifficulty,
          difficultyDict,
        ],
      );

      const profileBannerUrl = useMemo(() => {
        if (!playerData) return null;
        return getEffectiveProfileBannerUrl({
          bannerPreset: playerData.bannerPreset,
          customBannerUrl: playerData.customBannerUrl,
          subjectUser: playerData.user,
        });
      }, [playerData]);

      const profileHeaderSurface = useMemo(() => {
        if (!playerData) return { style: null, imageAssets: {} };
        return getEffectiveProfileHeaderSurface({
          profileHeaderSurfaceStyle: playerData.profileHeaderSurfaceStyle,
          profileHeaderSurfaceImageAssets: playerData.profileHeaderSurfaceImageAssets,
          subjectUser: playerData.user,
        });
      }, [playerData]);

      const playerAliasNames = useMemo(
        () => normalizeProfileAliasNames(playerData, playerData?.name),
        [playerData],
      );

      const difficultyGraphDataWithDupes = useMemo(
        () => toDifficultyGraphData(playerData?.funFacts?.clearsByDifficulty, difficultyDict || {}, "passes"),
        [playerData?.funFacts?.clearsByDifficulty, difficultyDict],
      );

      const difficultyGraphDataNoDupes = useMemo(
        () => toDifficultyGraphData(playerData?.funFacts?.clearsByDifficultyNoDupes, difficultyDict || {}, "passes"),
        [playerData?.funFacts?.clearsByDifficultyNoDupes, difficultyDict],
      );

      // Swap the reference directly so recharts animates between the two
      // datasets (same length/order, only `passCount` values change).
      const difficultyGraphData = includeDupes
        ? difficultyGraphDataWithDupes
        : difficultyGraphDataNoDupes;

      const rankHistoryMetricOptions = useMemo(
        () => [
          { value: 'rankedScore', label: t('profile.sections.rankHistory.metricRanked') },
          { value: 'generalScore', label: t('profile.sections.rankHistory.metricGeneral') },
        ],
        [t],
      );

      const rankHistorySelectedMetricOption = useMemo(
        () =>
          rankHistoryMetricOptions.find((o) => o.value === rankHistoryMetric) ??
          rankHistoryMetricOptions[0],
        [rankHistoryMetricOptions, rankHistoryMetric],
      );

      useEffect(() => {
        const id =
          playerId != null && playerId !== ''
            ? Number(playerId)
            : NaN;
        if (!Number.isFinite(id) || id <= 0 || !playerData) {
          setRankHistorySeries([]);
          return;
        }
        let cancelled = false;
        (async () => {
          setRankHistoryLoading(true);
          setRankHistoryError(null);
          setRankHistorySeries([]);
          try {
            const range = computeRankHistoryFromTo(
              rankHistoryRange,
              playerData.createdAt,
            );
            const from = range?.from;
            const to = range?.to;
            const query =
              from && to
                ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
                : '';
            const res = await api.get(
              `${routes.playersV3.root()}/${id}/rank-history${query}`,
            );
            if (cancelled) return;
            setRankHistorySeries(Array.isArray(res.data?.series) ? res.data.series : []);
          } catch (e) {
            if (!cancelled) {
              setRankHistoryError(
                e?.response?.data?.error || e?.message || 'error',
              );
              setRankHistorySeries([]);
            }
          } finally {
            if (!cancelled) setRankHistoryLoading(false);
          }
        })();
        return () => {
          cancelled = true;
        };
      }, [playerId, playerData, rankHistoryRange]);

      const rankHistoryChartData = useMemo(() => {
        if (!rankHistorySeries.length) return [];
        return rankHistorySeries.map((p) => ({
          date: formatDateShort(p.date, i18next?.language),
          rank:
            rankHistoryMetric === 'rankedScore'
              ? p.rankedScoreRank
              : p.generalScoreRank,
        }));
      }, [rankHistorySeries, rankHistoryMetric]);

      /**
       * Force chart remount when core inputs change so the line redraws from fresh state
       * instead of tweening between different datasets.
       */
      const rankHistoryChartKey = useMemo(() => {
        const first = rankHistoryChartData[0];
        const last = rankHistoryChartData[rankHistoryChartData.length - 1];
        return [
          rankHistoryMetric,
          rankHistoryRange,
          rankHistoryLoading ? 'loading' : 'ready',
          rankHistoryChartData.length,
          first?.date ?? 'none',
          first?.rank ?? 'none',
          last?.date ?? 'none',
          last?.rank ?? 'none',
        ].join('|');
      }, [rankHistoryMetric, rankHistoryRange, rankHistoryLoading, rankHistoryChartData]);

      /** Y-axis: pad ±10 around observed min/max ranks (not 0–max). */
      const rankHistoryYDomain = useMemo(() => {
        const delta = 5;
        const nums = rankHistoryChartData
          .map((d) => d.rank)
          .filter((r) => r != null && Number.isFinite(Number(r)))
          .map(Number);
        if (nums.length === 0) return [1, 11];
        const minR = Math.min(...nums);
        const maxR = Math.max(...nums);
        const low =
          minR < 1 ? minR - delta : Math.max(1, minR - delta);
        let high = maxR + delta;
        if (low >= high) {
          high = low + delta;
        }
        return [low, high];
      }, [rankHistoryChartData]);

      const getTicks = (min, max, step = 5) => {
        const ticks = [];
        const start = Math.ceil(min / step) * step;
      
        for (let i = start; i <= max; i += step) {
          ticks.push(i);
        }
      
        return ticks;
      };

      const favoriteItems = useMemo(() => {
        const resolved = playerData?.profileModulesResolved;
        if (!resolved || typeof resolved !== "object") return [];
        for (const row of Object.values(resolved)) {
          if (Array.isArray(row?.items)) return row.items;
        }
        return [];
      }, [playerData?.profileModulesResolved]);

      const moduleEmptyContext = useMemo(
        () => ({
          profile: playerData,
          bioCanvasEntitled: isTufStellarAccessActive(playerData?.user),
          difficultyGraphData,
          rankHistory: {
            loading: rankHistoryLoading,
            error: rankHistoryError,
            series: rankHistoryChartData,
          },
          scores: {
            loading: passesInitialLoading,
            total: passesTotal,
            displayedCount: displayedPasses.length,
            funFactTotal: playerData?.funFacts?.counts?.totalPasses,
          },
          favoriteItems,
        }),
        [
          playerData,
          difficultyGraphData,
          rankHistoryLoading,
          rankHistoryError,
          rankHistoryChartData,
          passesInitialLoading,
          passesTotal,
          displayedPasses.length,
          favoriteItems,
        ],
      );

      const loadMorePasses = () => {
        if (displayedPasses.length >= passesTotal) {
          setHasMore(false);
          return;
        }
        // Subsequent pages skip the debounce — they are a direct response to
        // the user scrolling and would feel laggy otherwise.
        fetchPassesPage(displayedPasses.length, { immediate: true });
      };

      // Conditional renders after all hooks.
      // Own profile resolves its id from the session, so wait for boot instead of
      // flashing the logged-out message while it is still in flight.
      if ((playerId && !playerData) || (!playerId && authLoading)) {
        return (
          <div className="account-profile-page player-page">
            <div className="player-body" style={{height: "85vh"}}>
              <div className="loader"/>  
            </div>
          </div>
        );
      }

      if (!playerId && !user) {
        return (
          <div className="account-profile-page player-page">
            <MetaTags {...playerMeta} />
            <div className="player-body" style={{height: "85vh"}}>
                <h1 className="player-notfound">{t('profile.notLoggedIn')}</h1>
                <h2 className="player-search-for-other" onClick={handleSearchForOther}>{t('profile.searchForOther')}</h2>
            </div>  
          </div>
        );
      }

      return (
        <>
        {user && isOwnProfile ? (
          <AccountStatusBanners variant="profile" user={user} navigate={navigate} />
        ) : null}
        <div className="account-profile-page player-page">
          <MetaTags {...playerMeta} />
          
          <ScrollButton />

          {playerData != null ? (Object.keys(playerData).length > 0 ? (
            <div className="player-body">
              <div className="player-content">
                <div className="player-page__hero">
                  {ENABLE_ROULETTE ? (
                    <button
                      type="button"
                      className="case-open-button"
                      onClick={handleCaseOpenClick}
                      disabled={!user && !playerId}
                    >
                      <img src={caseOpen} alt="Case Open" />
                    </button>
                  ) : null}
                  <ProfileHeader
                    mode="player"
                    className="player-page__profile-header"
                    bannerUrl={profileBannerUrl}
                    headerSurfaceStyle={profileHeaderSurface.style}
                    headerSurfaceImageAssets={profileHeaderSurface.imageAssets}
                    iconSlots={iconSlots}
                    aliasNames={playerAliasNames}
                    playerDifficultyPanelDifficulties={difficulties}
                    playerDifficultyPanelClearsByDifficulty={difficultyPanelClearsByDifficulty}
                    avatarSubject={playerData}
                    avatarFrame={playerData?.equippedAvatarFrame?.frame ?? null}
                    stellarIconVariant={normalizeTufStellarIconVariant(playerData?.tufStellarIconVariant)}

                    name={playerData?.name || t("profile.meta.defaultTitle")}
                    handle={playerData?.user?.username}
                    country={playerData?.country}
                    badgeId={playerData?.rankedScoreRank}
                    highestRankedScore={playerData?.highestRankedScore}
                    profileId={playerData?.id ?? playerId}
                    followerCount={playerData?.followerCount}
                    showFollowerCount={playerData?.showFollowerCount !== false}
                    followersUrl={
                      playerData?.id ?? playerId
                        ? routes.playersV3.followers(playerData?.id ?? playerId)
                        : null
                    }
                    youtubeChannels={playerData?.youtubeChannels}
                    expandStatsAriaLabel={t("profile.funFacts.expandAria")}
                    collapseStatsAriaLabel={t("profile.funFacts.collapseAria")}
                    statGroups={statGroups}
                    statRowFilter={(row) => isOwnProfile || row.key !== "hiddenPasses"}
                    statRows={[
                      {
                        key: "rankedScore",
                        label: valueLabels.rankedScore,
                        value: formatNumber(playerData?.rankedScore || 0),
                      },
                      {
                        key: "averageXacc",
                        label: valueLabels.averageXacc,
                        value: formatAccuracyRatio(playerData?.averageXacc || 0),
                      },
                      {
                        key: "totalScoreV2",
                        label: valueLabels.totalScoreV2,
                        value: formatNumber(playerData?.totalScoreV2 || 0),
                      },
                    ]}
                    actions={
                      (() => {
                        const elements = [];

                        if (!isOwnProfile) {
                          elements.push(
                            <ProfileFollowButton
                              key="follow"
                              following={playerData?.isFollowing}
                              notifyLevel={playerData?.notifyLevel}
                              followRoute={routes.playersV3.follow(playerData?.id ?? playerId)}
                              onFollowChange={({ following, followerCount: nextCount, notifyLevel }) => {
                                setPlayerData((p) =>
                                  p && typeof p === "object"
                                    ? {
                                        ...p,
                                        isFollowing: following,
                                        notifyLevel: following ? notifyLevel : null,
                                        ...(Number.isFinite(Number(nextCount))
                                          ? { followerCount: Number(nextCount) }
                                          : {}),
                                      }
                                    : p,
                                );
                              }}
                            />
                          );
                        }
                        if (user && isOwnProfile) {
                          elements.push(
                            <Link
                              key="edit"
                              className="profile-header__action-btn"
                              to="/settings/player"
                              title={t("profile.editProfile")}
                              aria-label={t("profile.editProfile")}
                            >
                              <EditIcon color="var(--color-white)" size={32} />
                            </Link>
                          );
                        }
                        if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
                          elements.push(
                            <button
                              key="admin-edit"
                              type="button"
                              className="profile-header__action-btn"
                              onClick={handleAdminEditClick}
                              title={t("profile.adminEdit")}
                              aria-label={t("profile.adminEdit")}
                            >
                              <ShieldIcon color="var(--color-white)" size={32} />
                            </button>
                          );
                        }
                        if (playerData?.user?.username) {
                          elements.push(
                            <button
                              key="packs"
                              type="button"
                              className="profile-header__action-btn"
                              onClick={handleViewUserPacks}
                              title={t("profile.viewUserPacks")}
                              aria-label={t("profile.viewUserPacks")}
                            >
                              <PackIcon color="var(--color-white)" size={32} />
                            </button>
                          );
                        }
                        if (playerData?.user?.creator?.id) {
                          elements.push(
                            <Link
                              key="creator-link"
                              className="profile-header__action-btn"
                              to={`/creator/${playerData.user.creator.id}`}
                              title={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                              aria-label={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                            >
                              <CreatorIcon color="var(--color-white)" size={28} />
                            </Link>
                          );
                        }

                        return elements.length > 0 ? <>{elements}</> : null;
                      })()
                    }
               
                  />
                </div>
              </div>

              <ProfileModulesRenderer
                kind="player"
                profileModules={playerData?.profileModules}
                isOwner={Boolean(user && isOwnProfile)}
                emptyContext={moduleEmptyContext}
                renderModule={(mod) => {
                  if (mod.type === "bio") {
                    return (
                      <PlayerBioModule
                        playerData={playerData}
                        subjectUser={playerData?.user}
                        collapsed={bioCollapsed}
                        onCollapsedChange={setBioCollapsed}
                      />
                    );
                  }
                  if (mod.type === "tournaments") {
                    return (
                      <TournamentPlacementsSection
                        placements={playerData?.tournamentPlacements}
                        orderIds={playerData?.placementOrderIds}
                      />
                    );
                  }
                  if (mod.type === "scoreBreakdown") {
                    return (
                      <PlayerScoreBreakdownModule
                        playerId={playerId}
                        tiles={scoreBreakdownTiles}
                        collapsed={scoreBreakdownCollapsed}
                        onCollapsedChange={setScoreBreakdownCollapsed}
                      />
                    );
                  }
                  if (mod.type === "difficulty") {
                    return (
                      <PlayerDifficultyModule
                        graphData={difficultyGraphData}
                        includeDupes={includeDupes}
                        onIncludeDupesChange={setIncludeDupes}
                        collapsed={difficultyCollapsed}
                        onCollapsedChange={setDifficultyCollapsed}
                      />
                    );
                  }
                  if (mod.type === "rankHistory") {
                    return (
                      <PlayerRankHistoryModule
                        collapsed={rankHistoryCollapsed}
                        onCollapsedChange={setRankHistoryCollapsed}
                        metricOptions={rankHistoryMetricOptions}
                        selectedMetricOption={rankHistorySelectedMetricOption}
                        onMetricChange={setRankHistoryMetric}
                        range={rankHistoryRange}
                        onRangeChange={setRankHistoryRange}
                        chartKey={rankHistoryChartKey}
                        chartData={rankHistoryChartData}
                        yDomain={rankHistoryYDomain}
                        getTicks={getTicks}
                        utcWholeDaysAgo={utcWholeDaysAgo}
                        loading={rankHistoryLoading}
                        error={rankHistoryError}
                      />
                    );
                  }
                  if (mod.type === "scores") {
                    return (
                      <PlayerScoresModule
                        collapsed={scoresCollapsed}
                        onCollapsedChange={setScoresCollapsed}
                        scoresScrollRef={scoresScrollRef}
                        scoresScrollParent={scoresScrollParent}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        sortOptions={sortOptions}
                        selectedSortOption={selectedSortOption}
                        onSortTypeChange={setSortType}
                        sortOrder={sortOrder}
                        onSortOrderChange={setSortOrder}
                        hideReclears={hideReclears}
                        onHideReclearsChange={setHideReclears}
                        isOwnProfile={isOwnProfile}
                        showHiddenPasses={showHiddenPasses}
                        onToggleHiddenPasses={() => setShowHiddenPasses(!showHiddenPasses)}
                        passesTotal={passesTotal}
                        passesInitialLoading={passesInitialLoading}
                        displayedPasses={displayedPasses}
                        loadMorePasses={loadMorePasses}
                        hasMore={hasMore}
                        playerData={playerData}
                        lowestImpactScore={lowestImpactScore}
                        sortType={sortType}
                        normalizePassSearchQuery={normalizePassSearchQuery}
                      />
                    );
                  }
                  if (mod.type === "favorite") {
                    return (
                      <FavoriteShowcase
                        items={playerData?.profileModulesResolved?.[mod.id]?.items || []}
                        collapsed={favoriteCollapsed}
                        onCollapsedChange={setFavoriteCollapsed}
                      />
                    );
                  }
                  return null;
                }}
              />

            </div>
          ) : <h1 className="player-notfound">{t('profile.notFound')}</h1>)
          : <div className="loader"></div>}
          
          {showEditPopup && playerData && (
            <AdminPlayerPopup
              player={playerData}
              onClose={() => setShowEditPopup(false)}
              onUpdate={handlePlayerUpdate}
              onCreatorUserLinkedUpdate={handleCreatorUserLinkedUpdate}
            />
          )}

          {showCaseOpen && ENABLE_ROULETTE && (
            <div className={`case-open-popup ${isSpinning ? 'case-open-popup--spinning' : ''}`}>
              <div className="case-open-popup__overlay" onClick={!isSpinning ? handleCaseOpenClose : undefined}></div>
              <div className="case-open-popup__content">
                <CaseOpenSelector 
                  targetPlayerId={playerId || user?.playerId} 
                  onClose={handleCaseOpenClose}
                  isSpinning={setIsSpinning}
                />
              </div>
            </div>
          )}

        </div>
        </>
      );
}

export default ProfilePage