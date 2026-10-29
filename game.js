/**
 * TIẾN LÊN MIỀN NAM - ĐẾM LÁ (NHẤT ĂN TẤT) + WIFI MULTIPLAYER (2 - 4 NGƯỜI) & BOT AI
 * Hỗ trợ:
 * - Chơi qua WiFi từ 2 đến 4 người (Gửi link http://<IP-WiFi>:8080/?room=XXXX)
 * - Kết hợp cả Local WiFi HTTP Server & PeerJS P2P dự phòng
 * - Chơi Offline với Bot
 * - Luật Nhất Ăn Tất, Đếm Lá (20 xu/lá, Cóng 13 lá = 520 xu), Thối 3♠/Heo/Tứ quý/Đôi thông, Đút 3♠ cuối
 */

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = ['♠', '♣', '♦', '♥']; // Bích < Chuồn < Rô < Cơ
const AVATARS = ['😎', '🐯', '🦊', '🐼'];

// Vốn cấp sẵn: 20,000 xu (~100 ván thắng thua) & Hồi phục mỗi ngày: +5,000 xu
const INITIAL_COINS = 20000;
const DAILY_RECOVERY_COINS = 5000;
const MAX_DAILY_RELIEF_CLAIMS = 3;

// ============================================================================
// GENSHIN IMPACT SHOP CATALOG: CHARACTER SKINS, AVATARS & BURST SPLASH ART
// ============================================================================
const GENSHIN_BURST_ART = {
  raiden: 'https://enka.network/ui/UI_Gacha_AvatarImg_Shougun.png',
  skirk: 'https://enka.network/ui/UI_Gacha_AvatarImg_SkirkNew.png',
};

const ANIME_CARD_SKINS = [
  {
    id: 'classic',
    name: 'Cổ Điển Hoàng Gia',
    desc: 'Bộ bài truyền thống sắc nét, sang trọng (Mặc định).',
    price: 0,
    crest: '',
    imgUrl: '',
  },
  {
    id: 'sakura_miko',
    name: 'Yae Miko (Anh Đào Narukami)',
    desc: '[Hiếm] Hình nền Guuji Yae Miko đền Narukami & hoa anh đào Inazuma.',
    price: 2500,
    crest: '🌸',
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Yae.png',
  },
  {
    id: 'uchiha_sharingan',
    name: 'Arlecchino (Xích Nguyệt Phán Quyết)',
    desc: '[Sử Thi] Hình nền Quan Chấp Hành Arlecchino viền đỏ Huyết Nguyệt cực ngầu.',
    price: 4500,
    crest: '🩸',
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Arlecchino.png',
  },
  {
    id: 'gojo_infinity',
    name: 'Furina (Thủy Thần Fontaine)',
    desc: '[Sử Thi] Hình nền Thủy Thần Furina & hào quang đại dương xanh lam.',
    price: 6500,
    crest: '💧',
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Furina.png',
  },
  {
    id: 'sun_breathing',
    name: 'Raiden Shogun (Lôi Thần Vĩnh Hằng)',
    desc: '[Huyền Thoại] Hình nền Lôi Thần Ei & ấn sấm sét Vô Tưởng Nhất Đao.',
    price: 9500,
    crest: '⚡',
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Shougun.png',
  },
  {
    id: 'cyber_waifu',
    name: 'Skirk (Kiếm Khách Vực Sâu)',
    desc: '[Thần Thoại] Hình nền Skirk — Sư phụ Childe mang hào quang Tinh Không Vực Sâu.',
    price: 14000,
    crest: '🌌',
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_SkirkNew.png',
  },
];

const ANIME_AVATARS = [
  {
    id: 'default_cool',
    name: 'Hu Tao (Đường Chủ Vãng Sinh)',
    desc: 'Đường chủ Vãng Sinh Đường tinh nghịch (Mặc định miễn phí).',
    price: 0,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Hutao.png',
  },
  {
    id: 'anime_swordsman',
    name: 'Nahida (Thảo Thần Sumeru)',
    desc: '[Hiếm] Tiểu Vương Kusanali thông thái của vùng đất Sumeru.',
    price: 2000,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Nahida.png',
  },
  {
    id: 'anime_kitsune',
    name: 'Furina (Thủy Thần Fontaine)',
    desc: '[Sử Thi] Ngôi sao sân khấu Epiclese mang lại vận may rực rỡ.',
    price: 3800,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Furina.png',
  },
  {
    id: 'anime_sorcerer',
    name: 'Arlecchino (The Knave)',
    desc: '[Sử Thi] Quan Chấp Hành thứ 4 của Fatui với ngọn lửa Xích Nguyệt.',
    price: 6000,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Arlecchino.png',
  },
  {
    id: 'anime_shinobi',
    name: 'Raiden Shogun (Lôi Thần Ei)',
    desc: '[Huyền Thoại] Chúa tể sấm sét Inazuma với tuyệt kỹ Vô Tưởng Nhất Đao.',
    price: 8500,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Shougun.png',
  },
  {
    id: 'genshin_mavuika',
    name: 'Mavuika (Hỏa Thần Natlan)',
    desc: '[Huyền Thoại] Hỏa Thần rực cháy dẫn lối chiến thắng bất bại.',
    price: 10000,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_Mavuika.png',
  },
  {
    id: 'anime_empress',
    name: 'Skirk (Chân Truyền Vực Sâu)',
    desc: '[Thần Thoại] Nữ kiếm khách bí ẩn ngự trị Tinh Không Vực Sâu.',
    price: 12000,
    imgUrl: 'https://enka.network/ui/UI_AvatarIcon_SkirkNew.png',
  },
];

const BOT_ANIME_AVATARS = {
  1: 'https://enka.network/ui/UI_AvatarIcon_Shougun.png', // Bot Raiden Shogun
  2: 'https://enka.network/ui/UI_AvatarIcon_SkirkNew.png', // Bot Skirk
  3: 'https://enka.network/ui/UI_AvatarIcon_Furina.png', // Bot Furina
};

function getAvatarHtml(avatarIdOrEmoji) {
  const found = ANIME_AVATARS.find((a) => a.id === avatarIdOrEmoji);
  if (found && found.imgUrl) {
    return `<img class="anime-avatar-img" src="${found.imgUrl}" alt="${found.name}" referrerpolicy="no-referrer" />`;
  }
  if (typeof avatarIdOrEmoji === 'string' && avatarIdOrEmoji.startsWith('http')) {
    return `<img class="anime-avatar-img" src="${avatarIdOrEmoji}" alt="Genshin Avatar" referrerpolicy="no-referrer" />`;
  }
  return avatarIdOrEmoji || '😎';
}

function getCardSkinMeta(skinId) {
  return ANIME_CARD_SKINS.find((s) => s.id === skinId) || ANIME_CARD_SKINS[0];
}

const COMBO_TYPES = {
  SINGLE: 'SINGLE',
  PAIR: 'PAIR',
  TRIPLE: 'TRIPLE',
  STRAIGHT: 'STRAIGHT',
  FOUR_OF_A_KIND: 'FOUR_OF_A_KIND',
  THREE_PAIRS: 'THREE_PAIRS',
  FOUR_PAIRS: 'FOUR_PAIRS',
};

// Web Audio Synthesizer
class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.12, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  click() {
    this.playTone(520, 'triangle', 0.06, 0.09);
  }

  playCard() {
    this.playTone(320, 'triangle', 0.08, 0.14);
    this.playTone(640, 'sine', 0.09, 0.1, 0.03);
  }

  pass() {
    this.playTone(210, 'sine', 0.11, 0.09);
  }

  chop() {
    this.raidenBurst();
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 'triangle', 0.22, 0.15, idx * 0.09));
  }

  // Âm thanh Kỹ Năng Nộ Raiden Shogun: Sấm sét + Rút kiếm Vô Tưởng Nhất Đao
  raidenBurst() {
    this.playTone(95, 'sawtooth', 0.45, 0.24, 0);
    this.playTone(130, 'sawtooth', 0.35, 0.2, 0.05);
    this.playTone(880, 'triangle', 0.14, 0.22, 0.12);
    this.playTone(1318.5, 'sine', 0.28, 0.22, 0.16);
    this.playTone(1760, 'sawtooth', 0.38, 0.18, 0.2);
    this.playTone(220, 'square', 0.45, 0.16, 0.25);
  }

  // Âm thanh Kỹ Năng Nộ Skirk: Vực Sâu Phá Toái Tinh Không
  skirkBurst() {
    const cosmicNotes = [293.66, 440, 587.33, 880, 1174.66, 1760];
    cosmicNotes.forEach((n, idx) => {
      this.playTone(n, 'sine', 0.38, 0.16, idx * 0.06);
      this.playTone(n * 1.5, 'triangle', 0.28, 0.1, idx * 0.06 + 0.04);
    });
    this.playTone(110, 'sawtooth', 0.55, 0.2, 0.12);
  }
}

const sfx = new SoundFX();

function createDeck() {
  const deck = [];
  for (let r = 0; r < 13; r++) {
    for (let s = 0; s < 4; s++) {
      deck.push({
        id: `${RANKS[r]}${SUITS[s]}`,
        rankIndex: r,
        suitIndex: s,
        rank: RANKS[r],
        suit: SUITS[s],
        value: r * 4 + s,
        isRed: s >= 2,
      });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortCardsAsc(cards) {
  return [...cards].sort((a, b) => a.value - b.value);
}

function classifyCombo(cards) {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCardsAsc(cards);
  const n = sorted.length;
  const highCard = sorted[n - 1];
  const highValue = highCard.value;
  const highRank = highCard.rankIndex;

  if (n === 1) {
    return {
      type: COMBO_TYPES.SINGLE,
      cards: sorted,
      length: 1,
      highCard,
      highValue,
      highRank,
      label: `Lẻ ${highCard.rank}${highCard.suit}`,
    };
  }

  if (n === 2) {
    if (sorted[0].rankIndex === sorted[1].rankIndex) {
      return {
        type: COMBO_TYPES.PAIR,
        cards: sorted,
        length: 2,
        highCard,
        highValue,
        highRank,
        label: `Đôi ${highCard.rank}`,
      };
    }
    return null;
  }

  if (n === 3) {
    if (
      sorted[0].rankIndex === sorted[1].rankIndex &&
      sorted[1].rankIndex === sorted[2].rankIndex
    ) {
      return {
        type: COMBO_TYPES.TRIPLE,
        cards: sorted,
        length: 3,
        highCard,
        highValue,
        highRank,
        label: `Sám cô ${highCard.rank}`,
      };
    }
  }

  if (n === 4) {
    if (
      sorted[0].rankIndex === sorted[1].rankIndex &&
      sorted[1].rankIndex === sorted[2].rankIndex &&
      sorted[2].rankIndex === sorted[3].rankIndex
    ) {
      return {
        type: COMBO_TYPES.FOUR_OF_A_KIND,
        cards: sorted,
        length: 4,
        highCard,
        highValue,
        highRank,
        isBomb: true,
        label: `Tứ quý ${highCard.rank}`,
      };
    }
  }

  if ((n === 6 || n === 8) && highRank < 12) {
    let isConsecutivePairs = true;
    for (let i = 0; i < n; i += 2) {
      if (sorted[i].rankIndex !== sorted[i + 1].rankIndex) {
        isConsecutivePairs = false;
        break;
      }
      if (i > 0 && sorted[i].rankIndex !== sorted[i - 2].rankIndex + 1) {
        isConsecutivePairs = false;
        break;
      }
    }
    if (isConsecutivePairs) {
      const pairCount = n / 2;
      return {
        type: pairCount === 3 ? COMBO_TYPES.THREE_PAIRS : COMBO_TYPES.FOUR_PAIRS,
        cards: sorted,
        length: n,
        highCard,
        highValue,
        highRank,
        isBomb: true,
        label: `${pairCount} đôi thông (${sorted[0].rank}→${highCard.rank})`,
      };
    }
  }

  if (n >= 3 && highRank < 12) {
    let isStraight = true;
    for (let i = 1; i < n; i++) {
      if (sorted[i].rankIndex !== sorted[i - 1].rankIndex + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      return {
        type: COMBO_TYPES.STRAIGHT,
        cards: sorted,
        length: n,
        highCard,
        highValue,
        highRank,
        label: `Sảnh ${n} lá (${sorted[0].rank}→${highCard.rank}${highCard.suit})`,
      };
    }
  }

  return null;
}

function canBeatCombo(candidate, current) {
  if (!candidate) return { ok: false, isChop: false };
  if (!current) return { ok: true, isChop: false };

  if (candidate.type === current.type && candidate.length === current.length) {
    if (candidate.highValue > current.highValue) {
      const isBombOverBomb =
        candidate.type === COMBO_TYPES.THREE_PAIRS ||
        candidate.type === COMBO_TYPES.FOUR_OF_A_KIND ||
        candidate.type === COMBO_TYPES.FOUR_PAIRS;
      return {
        ok: true,
        isChop: isBombOverBomb,
        chopReason: isBombOverBomb ? `Đè ${current.label} bằng ${candidate.label}!` : undefined,
      };
    }
    return { ok: false, isChop: false };
  }

  const targetIsSingle2 = current.type === COMBO_TYPES.SINGLE && current.highRank === 12;
  const targetIsPair2 = current.type === COMBO_TYPES.PAIR && current.highRank === 12;
  const targetIs3Pairs = current.type === COMBO_TYPES.THREE_PAIRS;
  const targetIsQuad = current.type === COMBO_TYPES.FOUR_OF_A_KIND;

  if (candidate.type === COMBO_TYPES.THREE_PAIRS && targetIsSingle2) {
    return {
      ok: true,
      isChop: true,
      chopReason: `3 đôi thông chặt Heo ${current.highCard.suit}!`,
    };
  }

  if (candidate.type === COMBO_TYPES.FOUR_OF_A_KIND) {
    if (targetIsSingle2 || targetIsPair2 || targetIs3Pairs) {
      return {
        ok: true,
        isChop: true,
        chopReason: `${candidate.label} chặt ${current.label}!`,
      };
    }
  }

  if (candidate.type === COMBO_TYPES.FOUR_PAIRS) {
    if (targetIsSingle2 || targetIsPair2 || targetIs3Pairs || targetIsQuad) {
      return {
        ok: true,
        isChop: true,
        chopReason: `4 đôi thông chặt ${current.label}!`,
      };
    }
  }

  return { ok: false, isChop: false };
}

function checkToiTrang(hand, isFirstMatch) {
  const sorted = sortCardsAsc(hand);
  const rankCounts = new Array(13).fill(0);
  sorted.forEach((c) => rankCounts[c.rankIndex]++);

  if (rankCounts[12] === 4) return 'Tứ Quý Heo (4 quân 2)';
  if (isFirstMatch && rankCounts[0] === 4) return 'Tứ Quý 3 (Ván đầu)';

  let hasDragon = true;
  for (let r = 0; r <= 11; r++) {
    if (rankCounts[r] === 0) {
      hasDragon = false;
      break;
    }
  }
  if (hasDragon) return 'Sảnh Rồng (3 → A)';

  let maxConsecPairs = 0;
  let curConsecPairs = 0;
  for (let r = 0; r <= 11; r++) {
    if (rankCounts[r] >= 2) {
      curConsecPairs++;
      if (curConsecPairs > maxConsecPairs) maxConsecPairs = curConsecPairs;
    } else {
      curConsecPairs = 0;
    }
  }
  if (maxConsecPairs >= 5) return `${maxConsecPairs} Đôi Thông`;

  let totalPairs = 0;
  for (let r = 0; r < 13; r++) {
    totalPairs += Math.floor(rankCounts[r] / 2);
  }
  if (totalPairs >= 6) return '6 Đôi Bất Kỳ';

  return null;
}

function generateAllCombosFromHand(hand, preferredCard = null) {
  const sorted = sortCardsAsc(hand);
  const combos = [];

  const byRank = Array.from({ length: 13 }, () => []);
  sorted.forEach((c) => byRank[c.rankIndex].push(c));

  sorted.forEach((c) => {
    combos.push(classifyCombo([c]));
  });

  for (let r = 0; r < 13; r++) {
    const group = byRank[r];
    if (group.length >= 2) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          combos.push(classifyCombo([group[i], group[j]]));
        }
      }
    }
    if (group.length === 3) {
      combos.push(classifyCombo(group));
    } else if (group.length === 4) {
      combos.push(classifyCombo([group[0], group[1], group[2]]));
      combos.push(classifyCombo([group[0], group[1], group[3]]));
      combos.push(classifyCombo([group[0], group[2], group[3]]));
      combos.push(classifyCombo([group[1], group[2], group[3]]));
      combos.push(classifyCombo(group));
    }
  }

  for (let start = 0; start <= 9; start++) {
    if (byRank[start].length === 0) continue;
    const pickCardForRank = (r) => {
      if (preferredCard && preferredCard.rankIndex === r) return preferredCard;
      return byRank[r][0];
    };

    const currentRun = [pickCardForRank(start)];
    for (let next = start + 1; next <= 11; next++) {
      if (byRank[next].length === 0) break;
      const lowestOfNext = pickCardForRank(next);
      const highestOfNext = byRank[next][byRank[next].length - 1];

      const candidateLow = [...currentRun, lowestOfNext];
      if (candidateLow.length >= 3) {
        combos.push(classifyCombo(candidateLow));
      }
      if (highestOfNext.id !== lowestOfNext.id && candidateLow.length >= 3) {
        combos.push(classifyCombo([...currentRun, highestOfNext]));
      }
      currentRun.push(lowestOfNext);
    }
  }

  for (let start = 0; start <= 9; start++) {
    for (const pairCount of [3, 4]) {
      if (start + pairCount - 1 > 11) continue;
      let ok = true;
      const cards = [];
      for (let r = start; r < start + pairCount; r++) {
        if (byRank[r].length < 2) {
          ok = false;
          break;
        }
        const group = byRank[r];
        if (preferredCard && preferredCard.rankIndex === r) {
          const others = group.filter((c) => c.id !== preferredCard.id);
          const partner =
            r === start + pairCount - 1 ? others[others.length - 1] : others[0];
          cards.push(preferredCard, partner);
        } else if (r === start + pairCount - 1) {
          cards.push(group[group.length - 2], group[group.length - 1]);
        } else {
          cards.push(group[0], group[1]);
        }
      }
      if (ok) {
        const c = classifyCombo(cards);
        if (c) combos.push(c);
      }
    }
  }

  return combos.filter(Boolean);
}

function getValidMoves(
  hand,
  currentCombo,
  mustInclude3Spade = false,
  onlyFourPairsOutTurn = false,
  preferredCard = null
) {
  const all = generateAllCombosFromHand(hand, preferredCard);
  return all.filter((combo) => {
    if (onlyFourPairsOutTurn && combo.type !== COMBO_TYPES.FOUR_PAIRS) {
      return false;
    }
    if (mustInclude3Spade) {
      const has3Spade = combo.cards.some((c) => c.value === 0);
      if (!has3Spade) return false;
    }
    return canBeatCombo(combo, currentCombo).ok;
  });
}

function analyzeLoserHand(hand, wonBy3Spade = false) {
  const sorted = sortCardsAsc(hand);
  const penaltyCardIds = new Set();
  const breakdown = [];
  let totalPenalty = 0;

  if (sorted.length === 13) {
    totalPenalty += 520;
    breakdown.push({ label: 'Cóng 13 lá (-520)', isSpecial: true });
  } else if (sorted.length > 0) {
    const leafCost = sorted.length * 20;
    totalPenalty += leafCost;
    breakdown.push({ label: `${sorted.length} lá (-${leafCost})`, isSpecial: false });
  }

  const threeSpade = sorted.find((c) => c.value === 0);
  if (threeSpade) {
    totalPenalty += 100;
    penaltyCardIds.add(threeSpade.id);
    breakdown.push({ label: 'Thối 3♠ (-100)', isSpecial: true });
  }

  sorted.forEach((c) => {
    if (c.rankIndex === 12) {
      const pen = c.isRed ? 100 : 50;
      totalPenalty += pen;
      penaltyCardIds.add(c.id);
      breakdown.push({
        label: `Thối Heo ${c.isRed ? 'đỏ' : 'đen'} 2${c.suit} (-${pen})`,
        isSpecial: true,
      });
    }
  });

  const byRank = Array.from({ length: 13 }, () => []);
  sorted.forEach((c) => byRank[c.rankIndex].push(c));

  for (let r = 0; r <= 11; r++) {
    if (byRank[r].length === 4) {
      totalPenalty += 200;
      byRank[r].forEach((c) => penaltyCardIds.add(c.id));
      breakdown.push({ label: `Thối Tứ quý ${RANKS[r]} (-200)`, isSpecial: true });
    }
  }

  let runStart = -1;
  let runLen = 0;
  for (let r = 0; r <= 12; r++) {
    if (r <= 11 && byRank[r].length >= 2) {
      if (runLen === 0) runStart = r;
      runLen++;
    } else {
      if (runLen >= 4) {
        totalPenalty += 250;
        for (let k = runStart; k < runStart + runLen; k++) {
          byRank[k].slice(0, 2).forEach((c) => penaltyCardIds.add(c.id));
        }
        breakdown.push({ label: 'Thối 4 đôi thông (-250)', isSpecial: true });
      } else if (runLen === 3) {
        totalPenalty += 150;
        for (let k = runStart; k < runStart + 3; k++) {
          byRank[k].slice(0, 2).forEach((c) => penaltyCardIds.add(c.id));
        }
        breakdown.push({ label: 'Thối 3 đôi thông (-150)', isSpecial: true });
      }
      runLen = 0;
    }
  }

  if (wonBy3Spade) {
    totalPenalty += 150;
    breakdown.push({ label: 'Bị đút 3♠ cuối (-150)', isSpecial: true });
  }

  return {
    totalPenalty,
    breakdown,
    penaltyCardIds,
  };
}

function sortHandByMode(hand, mode) {
  if (mode === 'asc') {
    return sortCardsAsc(hand);
  }
  const sorted = sortCardsAsc(hand);
  const counts = {};
  sorted.forEach((c) => {
    counts[c.rankIndex] = (counts[c.rankIndex] || 0) + 1;
  });
  const multi = sorted.filter((c) => counts[c.rankIndex] >= 2);
  const singles = sorted.filter((c) => counts[c.rankIndex] === 1);
  return [...multi, ...singles];
}

// ============================================================================
// MAIN GAME + WIFI MULTIPLAYER CONTROLLER
// ============================================================================
class TienLenGame {
  constructor() {
    this.loadShopProfile();

    this.players = [
      { id: 0, name: 'Bạn', avatar: this.equippedAvatar, cardSkin: this.equippedSkin, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
      { id: 1, name: 'Bot Raiden Shogun', avatar: BOT_ANIME_AVATARS[1], cardSkin: 'sun_breathing', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Bot Skirk', avatar: BOT_ANIME_AVATARS[2], cardSkin: 'cyber_waifu', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Bot Furina', avatar: BOT_ANIME_AVATARS[3], cardSkin: 'gojo_infinity', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
    ];

    // Multiplayer state
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.myClientId = 'client_' + Math.random().toString(36).substring(2, 10);
    this.mySeatId = 0;
    this.lanServerIp = '192.168.85.102';
    this.lanServerPort = 8080;
    this.publicTunnelUrl = '';
    this.pollTimer = null;
    this.lastSyncedVersion = 0;
    this.peer = null;
    this.peerConnections = [];
    this.hostConn = null;

    this.matchCount = 0;
    this.lastWinnerId = null;
    this.currentTurn = 0;
    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.mustPlay3Spade = false;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;

    this.selectedCardIds = new Set();
    this.companionCardIds = new Set();
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.lastSummaryData = null;
    this.lastBurstEffect = null;
    this.lastShownBurstId = 0;
    this.burstTimeout = null;
    this.logsData = [];

    this.sortMode = 'asc';
    this.hintIndex = 0;
    this.botDelay = 850;
    this.speedMode = 1;
    this.isGameOver = false;
    this.botTimer = null;

    this.bindDOM();
    this.detectLanInfoAndUrlRoom();
    this.fetchLiveAnimeImages();
    this.startNewMatch(true);
    if (this.dailyRecoveredOnLoad) {
      this.addLog(
        `🌅 <strong>Quà Hồi Phục Hàng Ngày:</strong> Tài khoản của bạn vừa được hồi <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> cho ngày mới!`,
        'log-win'
      );
    }
  }

  fetchLiveAnimeImages() {
    // Tải trước (Preload) ảnh Splash Art Kỹ Năng Nộ của Raiden Shogun & Skirk để hiện tức thì 0ms
    try {
      [
        GENSHIN_BURST_ART.raiden,
        GENSHIN_BURST_ART.skirk,
        ...ANIME_CARD_SKINS.map((s) => s.imgUrl).filter(Boolean),
        ...ANIME_AVATARS.map((a) => a.imgUrl).filter(Boolean),
      ].forEach((url) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      });
    } catch (_) {}
  }

  triggerGenshinBurst(type, detailText, onDoneCallback = null) {
    const overlay = document.getElementById('genshin-burst-overlay');
    if (!overlay) {
      if (onDoneCallback) onDoneCallback();
      return;
    }

    const imgEl = document.getElementById('burst-character-img');
    const chakraEl = document.getElementById('burst-chakra-ring');
    const slashContainer = document.getElementById('burst-slash-container');
    const tagEl = document.getElementById('burst-skill-tag');
    const titleEl = document.getElementById('burst-skill-title');
    const quoteEl = document.getElementById('burst-skill-quote');
    const detailEl = document.getElementById('burst-skill-detail');
    const tableEl = document.querySelector('.casino-table');

    overlay.classList.remove('hidden', 'theme-raiden', 'theme-skirk');
    if (tableEl) {
      tableEl.classList.remove('burst-shake');
      void tableEl.offsetWidth;
      tableEl.classList.add('burst-shake');
    }

    if (type === 'raiden') {
      sfx.raidenBurst();
      overlay.classList.add('theme-raiden');
      imgEl.src = GENSHIN_BURST_ART.raiden;
      tagEl.textContent = '⚡ KỸ NĂNG NỘ • RAIDEN SHOGUN (MUSOU NO HITOTACHI)';
      titleEl.textContent = 'BÍ THUẬT: MỘNG TƯỞNG CHÂN THUYẾT';
      quoteEl.textContent = '“Vô Tưởng Nhất Đao — Chặt Đứt Vĩnh Hằng!”';
      detailEl.textContent = detailText;

      chakraEl.innerHTML = `
        <svg viewBox="0 0 200 200" width="90%" height="90%">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#e879f9" stroke-width="2.5" stroke-dasharray="10 6"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#c084fc" stroke-width="1.5"/>
          <polygon points="100,14 122,78 186,100 122,122 100,186 78,122 14,100 78,78" fill="none" stroke="#f0abfc" stroke-width="2" opacity="0.75"/>
        </svg>
      `;

      slashContainer.innerHTML = `
        <div class="raiden-slash-beam"></div>
        <svg class="burst-svg-fx" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <polyline points="0,480 230,380 210,415 490,295 475,325 760,195 1000,90" fill="none" stroke="#ffffff" stroke-width="5" filter="drop-shadow(0 0 16px #d946ef)"/>
          <polyline points="120,80 340,260 320,290 610,360 890,520" fill="none" stroke="#e879f9" stroke-width="3" opacity="0.85"/>
          <polyline points="680,40 540,240 580,260 410,490" fill="none" stroke="#c084fc" stroke-width="3" opacity="0.8"/>
        </svg>
      `;
    } else {
      sfx.skirkBurst();
      overlay.classList.add('theme-skirk');
      imgEl.src = GENSHIN_BURST_ART.skirk;
      tagEl.textContent = '🌌 KỸ NĂNG NỘ • SKIRK (ABYSSAL STARSHATTER)';
      titleEl.textContent = 'TUYỆT KỸ VỰC SÂU: PHÁ TOÁI TINH KHÔNG';
      quoteEl.textContent = '“Vạn Vật Quy Hư Vô — Nhất Ăn Tất!”';
      detailEl.textContent = detailText;

      chakraEl.innerHTML = `
        <svg viewBox="0 0 200 200" width="92%" height="92%">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="14 6"/>
          <polygon points="100,8 126,74 192,100 126,126 100,192 74,126 8,100 74,74" fill="none" stroke="#7dd3fc" stroke-width="2.2"/>
          <polygon points="35,35 100,68 165,35 132,100 165,165 100,132 35,165 68,100" fill="none" stroke="#e879f9" stroke-width="1.8" opacity="0.8"/>
        </svg>
      `;

      slashContainer.innerHTML = `
        <div class="skirk-slash-beam-1"></div>
        <div class="skirk-slash-beam-2"></div>
        <svg class="burst-svg-fx" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <line x1="50" y1="520" x2="950" y2="80" stroke="#7dd3fc" stroke-width="4"/>
          <line x1="80" y1="90" x2="920" y2="510" stroke="#e879f9" stroke-width="4"/>
          <polygon points="500,220 520,280 580,300 520,320 500,380 480,320 420,300 480,280" fill="#ffffff" opacity="0.9"/>
        </svg>
      `;
    }

    clearTimeout(this.burstTimeout);
    const finishBurst = () => {
      clearTimeout(this.burstTimeout);
      overlay.classList.add('hidden');
      overlay.onclick = null;
      if (onDoneCallback) onDoneCallback();
    };

    overlay.onclick = finishBurst;
    this.burstTimeout = setTimeout(finishBurst, type === 'skirk' ? 2350 : 1950);
  }

  // ============================================================================
  // ANIME SHOP, 20,000 XU INITIAL BALANCE & DAILY RECOVERY (+5,000 XU / DAY)
  // ============================================================================
  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }

  loadShopProfile() {
    const today = this.getTodayKey();
    this.savedCoins = INITIAL_COINS; // Cấp sẵn 20,000 xu (~100 ván thắng thua)
    this.unlockedSkins = new Set(['classic']);
    this.equippedSkin = 'classic';
    this.unlockedAvatars = new Set(['default_cool']);
    this.equippedAvatar = 'default_cool';
    this.lastDailyDate = today;
    this.dailyReliefUsed = 0;
    this.dailyRecoveredOnLoad = false;

    try {
      // Giữ lại vật phẩm từ bản v1 nếu người chơi đã mở trước đó, nhưng nâng vốn lên chuẩn v2 (20,000 xu)
      const rawV2 = localStorage.getItem('tlmn_anime_profile_v2');
      const rawV1 = localStorage.getItem('tlmn_anime_profile_v1');

      if (rawV2) {
        const data = JSON.parse(rawV2);
        if (typeof data.coins === 'number') this.savedCoins = data.coins;
        if (Array.isArray(data.unlockedSkins)) {
          this.unlockedSkins = new Set(['classic', ...data.unlockedSkins]);
        }
        if (data.equippedSkin) this.equippedSkin = data.equippedSkin;
        if (Array.isArray(data.unlockedAvatars)) {
          this.unlockedAvatars = new Set(['default_cool', ...data.unlockedAvatars]);
        }
        if (data.equippedAvatar) this.equippedAvatar = data.equippedAvatar;
        if (data.lastDailyDate) this.lastDailyDate = data.lastDailyDate;
        if (typeof data.dailyReliefUsed === 'number') this.dailyReliefUsed = data.dailyReliefUsed;

        // Nếu bước sang ngày mới: tự động hồi +5,000 xu và reset lượt cứu trợ trong ngày
        if (this.lastDailyDate !== today) {
          this.lastDailyDate = today;
          this.dailyReliefUsed = 0;
          if (this.savedCoins < INITIAL_COINS) {
            this.savedCoins = Math.min(INITIAL_COINS, this.savedCoins + DAILY_RECOVERY_COINS);
            this.dailyRecoveredOnLoad = true;
          } else {
            this.savedCoins += Math.floor(DAILY_RECOVERY_COINS / 2);
            this.dailyRecoveredOnLoad = true;
          }
        }
      } else if (rawV1) {
        const dataV1 = JSON.parse(rawV1);
        if (Array.isArray(dataV1.unlockedSkins)) {
          this.unlockedSkins = new Set(['classic', ...dataV1.unlockedSkins]);
        }
        if (dataV1.equippedSkin) this.equippedSkin = dataV1.equippedSkin;
        if (Array.isArray(dataV1.unlockedAvatars)) {
          this.unlockedAvatars = new Set(['default_cool', ...dataV1.unlockedAvatars]);
        }
        if (dataV1.equippedAvatar) this.equippedAvatar = dataV1.equippedAvatar;
        this.savedCoins = INITIAL_COINS;
      }
      this.saveShopProfile();
    } catch (_) {}
  }

  saveShopProfile() {
    try {
      const me = this.players ? this.getLocalPlayer() : null;
      if (me) {
        this.savedCoins = me.coins;
      }
      const payload = {
        coins: this.savedCoins,
        unlockedSkins: Array.from(this.unlockedSkins),
        equippedSkin: this.equippedSkin,
        unlockedAvatars: Array.from(this.unlockedAvatars),
        equippedAvatar: this.equippedAvatar,
        lastDailyDate: this.lastDailyDate || this.getTodayKey(),
        dailyReliefUsed: this.dailyReliefUsed || 0,
      };
      localStorage.setItem('tlmn_anime_profile_v2', JSON.stringify(payload));
    } catch (_) {}
  }

  checkAndTriggerAutoRelief() {
    // Tự động hồi vốn nếu bất kỳ người chơi hoặc Bot nào cạn tiền (< 300 xu) sau ván bài
    const today = this.getTodayKey();
    if (this.lastDailyDate !== today) {
      this.lastDailyDate = today;
      this.dailyReliefUsed = 0;
    }

    this.players.forEach((p) => {
      if (!p.active) return;
      if (p.coins < 300) {
        p.coins = Math.max(0, p.coins) + DAILY_RECOVERY_COINS;
        if (p.id === this.mySeatId) {
          this.dailyReliefUsed = Math.min(MAX_DAILY_RELIEF_CLAIMS, this.dailyReliefUsed + 1);
          this.saveShopProfile();
        }
        this.addLog(
          `💖 <strong>Trợ Cấp Hồi Vốn Mỗi Ngày:</strong> <strong>${p.name}</strong> cạn xu nên được hệ thống hồi ngay <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> để chơi tiếp!`,
          'log-win'
        );
      }
    });
  }

  renderShopModal() {
    const me = this.getLocalPlayer();
    const balanceEl = document.getElementById('shop-balance');
    if (balanceEl && me) {
      balanceEl.textContent = me.coins.toLocaleString();
    }

    const bonusBtn = document.getElementById('btn-claim-bonus');
    if (bonusBtn) {
      const remaining = Math.max(0, MAX_DAILY_RELIEF_CLAIMS - (this.dailyReliefUsed || 0));
      bonusBtn.textContent =
        remaining > 0
          ? `🎁 Hồi Xu Hàng Ngày (+${DAILY_RECOVERY_COINS.toLocaleString()} Xu • Còn ${remaining}/${MAX_DAILY_RELIEF_CLAIMS} lượt hôm nay)`
          : `✅ Đã nhận đủ ${MAX_DAILY_RELIEF_CLAIMS} lượt hồi xu hôm nay (Mai hồi tiếp +5,000 xu)`;
    }

    const skinsGrid = document.getElementById('shop-skins-grid');
    if (skinsGrid) {
      skinsGrid.innerHTML = ANIME_CARD_SKINS.map((skin) => {
        const owned = this.unlockedSkins.has(skin.id);
        const equipped = this.equippedSkin === skin.id;
        const canAfford = me && me.coins >= skin.price;

        let btnClass = 'buy-btn';
        let btnLabel = `🪙 Mua (${skin.price.toLocaleString()} xu)`;
        if (equipped) {
          btnClass = 'equipped-btn';
          btnLabel = '✨ Đang trang bị';
        } else if (owned) {
          btnClass = 'equip-btn';
          btnLabel = 'Trang bị ngay';
        } else if (!canAfford) {
          btnClass = 'cant-afford';
          btnLabel = `🔒 Cần ${skin.price.toLocaleString()} xu`;
        }

        const crestHtml = skin.crest
          ? `<span class="card-anime-crest">${skin.crest}</span>`
          : '';
        const bgArtHtml = skin.imgUrl
          ? `<div class="card-anime-art" style="background-image:url('${skin.imgUrl}')"></div>`
          : '';

        return `
          <div class="shop-item-card ${equipped ? 'equipped' : ''}">
            <div class="shop-card-preview-wrap">
              <div class="playing-card red-card is-two skin-${skin.id}" style="width:68px;height:96px;cursor:default;">
                ${bgArtHtml}
                <div class="card-corner top-left">
                  <span class="card-rank">2</span>
                  <span class="card-suit-small">♥</span>
                </div>
                ${crestHtml}
                <div class="card-center-art" style="font-size:1.7rem;">♥</div>
                <div class="card-corner bottom-right">
                  <span class="card-rank">2</span>
                  <span class="card-suit-small">♥</span>
                </div>
              </div>
              <div class="playing-card black-card skin-${skin.id}" style="width:68px;height:96px;cursor:default;">
                ${bgArtHtml}
                <div class="card-corner top-left">
                  <span class="card-rank">A</span>
                  <span class="card-suit-small">♠</span>
                </div>
                ${crestHtml}
                <div class="card-center-art" style="font-size:1.7rem;">♠</div>
                <div class="card-corner bottom-right">
                  <span class="card-rank">A</span>
                  <span class="card-suit-small">♠</span>
                </div>
              </div>
            </div>
            <div class="shop-item-title">${skin.name}</div>
            <div class="shop-item-desc">${skin.desc}</div>
            <button class="shop-buy-btn ${btnClass}" onclick="window.tienLenGame.buyOrEquipSkin('${skin.id}')">
              ${btnLabel}
            </button>
          </div>
        `;
      }).join('');
    }

    const avatarsGrid = document.getElementById('shop-avatars-grid');
    if (avatarsGrid) {
      avatarsGrid.innerHTML = ANIME_AVATARS.map((av) => {
        const owned = this.unlockedAvatars.has(av.id);
        const equipped = this.equippedAvatar === av.id;
        const canAfford = me && me.coins >= av.price;

        let btnClass = 'buy-btn';
        let btnLabel = `🪙 Mua (${av.price.toLocaleString()} xu)`;
        if (equipped) {
          btnClass = 'equipped-btn';
          btnLabel = '✨ Đang dùng';
        } else if (owned) {
          btnClass = 'equip-btn';
          btnLabel = 'Chọn Avatar';
        } else if (!canAfford) {
          btnClass = 'cant-afford';
          btnLabel = `🔒 Cần ${av.price.toLocaleString()} xu`;
        }

        return `
          <div class="shop-item-card ${equipped ? 'equipped' : ''}">
            <div class="shop-avatar-preview-wrap">
              <img class="anime-avatar-img" src="${av.imgUrl}" alt="${av.name}" referrerpolicy="no-referrer" />
            </div>
            <div class="shop-item-title">${av.name}</div>
            <div class="shop-item-desc">${av.desc}</div>
            <button class="shop-buy-btn ${btnClass}" onclick="window.tienLenGame.buyOrEquipAvatar('${av.id}')">
              ${btnLabel}
            </button>
          </div>
        `;
      }).join('');
    }
  }

  buyOrEquipSkin(skinId) {
    const skin = ANIME_CARD_SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedSkins.has(skinId)) {
      if (me.coins < skin.price) {
        alert(
          `Bạn chưa đủ xu! Bộ bài "${skin.name}" cần ${skin.price.toLocaleString()} xu.\n💡 Bạn có thể đánh thắng thêm ván bài hoặc bấm nút "🎁 Hồi Xu Hàng Ngày (+5,000 Xu)" ở góc dưới Cửa Hàng!`
        );
        return;
      }
      me.coins -= skin.price;
      this.unlockedSkins.add(skinId);
      sfx.win();
      this.addLog(
        `🛍️ Bạn đã mở khóa bộ bài Anime <strong>${skin.name}</strong> (-${skin.price.toLocaleString()} xu)!`,
        'log-win'
      );
    } else {
      sfx.click();
    }

    this.equippedSkin = skinId;
    me.cardSkin = skinId;
    this.saveShopProfile();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  buyOrEquipAvatar(avatarId) {
    const av = ANIME_AVATARS.find((a) => a.id === avatarId);
    if (!av) return;
    const me = this.getLocalPlayer();
    if (!me) return;

    if (!this.unlockedAvatars.has(avatarId)) {
      if (me.coins < av.price) {
        alert(
          `Bạn chưa đủ xu! Avatar "${av.name}" cần ${av.price.toLocaleString()} xu.\n💡 Bạn có thể đánh thắng thêm ván bài hoặc bấm nút "🎁 Hồi Xu Hàng Ngày (+5,000 Xu)" ở góc dưới Cửa Hàng!`
        );
        return;
      }
      me.coins -= av.price;
      this.unlockedAvatars.add(avatarId);
      sfx.win();
      this.addLog(
        `🛍️ Bạn đã sở hữu Avatar Anime <strong>${av.name}</strong> (-${av.price.toLocaleString()} xu)!`,
        'log-win'
      );
    } else {
      sfx.click();
    }

    this.equippedAvatar = avatarId;
    me.avatar = avatarId;
    this.saveShopProfile();
    this.renderShopModal();
    this.renderAll();
    this.syncCosmeticsInRoom();
  }

  claimFreeBonus() {
    const me = this.getLocalPlayer();
    if (!me) return;
    const today = this.getTodayKey();
    if (this.lastDailyDate !== today) {
      this.lastDailyDate = today;
      this.dailyReliefUsed = 0;
    }

    if (this.dailyReliefUsed >= MAX_DAILY_RELIEF_CLAIMS) {
      alert(
        `Hôm nay bạn đã nhận đủ ${MAX_DAILY_RELIEF_CLAIMS}/${MAX_DAILY_RELIEF_CLAIMS} gói Hồi Xu Hàng Ngày (+15,000 xu tổng cộng).\n🌅 Ngày mai hệ thống sẽ tự động hồi tiếp +5,000 xu cho bạn!`
      );
      return;
    }

    this.dailyReliefUsed++;
    me.coins += DAILY_RECOVERY_COINS;
    sfx.win();
    this.saveShopProfile();
    this.renderShopModal();
    this.renderSeats();
    this.addLog(
      `🎁 Bạn vừa nhận gói Hồi Xu Hàng Ngày <strong>+${DAILY_RECOVERY_COINS.toLocaleString()} xu</strong> (Lượt ${this.dailyReliefUsed}/${MAX_DAILY_RELIEF_CLAIMS} hôm nay)!`,
      'log-win'
    );
    this.syncCosmeticsInRoom();
  }

  syncCosmeticsInRoom() {
    if (!this.isMultiplayer) return;
    const me = this.getLocalPlayer();
    if (this.isHost) {
      this.broadcastState();
    } else {
      this.sendClientEvent({
        type: 'UPDATE_COSMETICS',
        clientId: this.myClientId,
        avatar: this.equippedAvatar,
        cardSkin: this.equippedSkin,
        coins: me ? me.coins : INITIAL_COINS,
      });
    }
  }

  bindDOM() {
    this.elMatchInfo = document.getElementById('match-info');
    this.elFirstTurnBadge = document.getElementById('first-turn-badge');
    this.elTurnBanner = document.getElementById('turn-banner');
    this.elComboAnnouncement = document.getElementById('combo-announcement');
    this.elCurrentTrick = document.getElementById('current-trick');
    this.elPreviousTrick = document.getElementById('previous-trick');
    this.elTrickOwnerLabel = document.getElementById('trick-owner-label');
    this.elHumanHand = document.getElementById('human-hand');
    this.elSelectedPreview = document.getElementById('selected-combo-preview');
    this.elGameLog = document.getElementById('game-log');

    this.btnPlay = document.getElementById('btn-play');
    this.btnPass = document.getElementById('btn-pass');
    this.btnSort = document.getElementById('btn-sort');
    this.btnUnselect = document.getElementById('btn-unselect');
    this.btnHint = document.getElementById('btn-hint');
    this.btnNewGame = document.getElementById('btn-new-game');
    this.btnShowSummary = document.getElementById('btn-show-summary');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnSound = document.getElementById('btn-sound');
    this.btnRules = document.getElementById('btn-rules');
    this.btnResetCoins = document.getElementById('btn-reset-coins');
    this.btnWifi = document.getElementById('btn-wifi');
    this.btnShop = document.getElementById('btn-shop');

    this.modalSummary = document.getElementById('summary-modal');
    this.modalRules = document.getElementById('rules-modal');
    this.modalWifi = document.getElementById('wifi-modal');
    this.modalShop = document.getElementById('shop-modal');

    if (this.btnShop && this.modalShop) {
      this.btnShop.addEventListener('click', () => {
        this.renderShopModal();
        this.modalShop.classList.remove('hidden');
        sfx.click();
      });

      document.getElementById('btn-close-shop')?.addEventListener('click', () => {
        this.modalShop.classList.add('hidden');
        sfx.click();
      });

      document.getElementById('btn-ok-shop')?.addEventListener('click', () => {
        this.modalShop.classList.add('hidden');
        sfx.click();
      });

      const tabSkinsBtn = document.getElementById('tab-btn-skins');
      const tabAvatarsBtn = document.getElementById('tab-btn-avatars');
      const skinsGrid = document.getElementById('shop-skins-grid');
      const avatarsGrid = document.getElementById('shop-avatars-grid');

      tabSkinsBtn?.addEventListener('click', () => {
        tabSkinsBtn.classList.add('active');
        tabAvatarsBtn?.classList.remove('active');
        skinsGrid?.classList.remove('hidden');
        avatarsGrid?.classList.add('hidden');
        sfx.click();
      });

      tabAvatarsBtn?.addEventListener('click', () => {
        tabAvatarsBtn.classList.add('active');
        tabSkinsBtn?.classList.remove('active');
        avatarsGrid?.classList.remove('hidden');
        skinsGrid?.classList.add('hidden');
        sfx.click();
      });

      document.getElementById('btn-claim-bonus')?.addEventListener('click', () => {
        this.claimFreeBonus();
      });
    }

    this.btnPlay.addEventListener('click', () => this.onHumanPlay());
    this.btnPass.addEventListener('click', () => this.onHumanPass());
    this.btnSort.addEventListener('click', () => this.toggleSortMode());
    this.btnUnselect.addEventListener('click', () => this.clearSelection());
    this.btnHint.addEventListener('click', () => this.onHumanHint());
    this.btnNewGame.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) {
        alert('Chỉ Chủ phòng mới có thể chia ván mới!');
        return;
      }
      this.startNewMatch(false);
    });

    this.btnWifi.addEventListener('click', async () => {
      await this.refreshServerInfo();
      if (this.roomId) {
        document.getElementById('share-link-input').value = this.getShareableRoomUrl(this.roomId);
      }
      this.modalWifi.classList.remove('hidden');
      this.renderLobbyModal();
      sfx.click();
    });

    document.getElementById('btn-close-wifi').addEventListener('click', () => {
      this.modalWifi.classList.add('hidden');
    });

    document.getElementById('btn-create-room').addEventListener('click', () => {
      this.createWifiRoom();
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.trim().toUpperCase();
      if (!code) {
        alert('Vui lòng nhập Mã phòng 4 chữ số!');
        return;
      }
      this.joinWifiRoom(code);
    });

    document.getElementById('btn-copy-link').addEventListener('click', async () => {
      await this.refreshServerInfo();
      const input = document.getElementById('share-link-input');
      if (this.roomId) {
        input.value = this.getShareableRoomUrl(this.roomId);
      }
      input.select();
      navigator.clipboard?.writeText(input.value);
      const btn = document.getElementById('btn-copy-link');
      btn.textContent = '✅ Đã Copy!';
      setTimeout(() => (btn.textContent = '📋 Copy Link'), 1800);
      sfx.click();
    });

    document.getElementById('btn-leave-room').addEventListener('click', () => {
      this.switchToSoloBotMode();
    });

    document.getElementById('btn-solo-bot-mode').addEventListener('click', () => {
      this.switchToSoloBotMode();
      this.modalWifi.classList.add('hidden');
    });

    document.getElementById('btn-start-wifi-match').addEventListener('click', () => {
      if (!this.isHost) return;
      const activeCount = this.players.filter((p) => p.active).length;
      if (activeCount < 2) {
        alert('Cần tối thiểu 2 người chơi trong bàn để bắt đầu!');
        return;
      }
      this.modalWifi.classList.add('hidden');
      this.startNewMatch(false);
    });

    this.btnShowSummary.addEventListener('click', () => {
      this.modalSummary.classList.remove('hidden');
      sfx.click();
    });

    document.getElementById('btn-close-summary').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
    });

    document.getElementById('btn-peek-table').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      sfx.click();
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
      this.modalSummary.classList.add('hidden');
      if (this.isMultiplayer && !this.isHost) {
        this.elTurnBanner.textContent = '⏳ Đang chờ Chủ phòng bấm Chia ván tiếp theo...';
        return;
      }
      this.startNewMatch(false);
    });

    this.btnSpeed.addEventListener('click', () => {
      this.speedMode = (this.speedMode + 1) % 3;
      const labels = ['Chậm', 'Chuẩn', 'Nhanh'];
      const delays = [1350, 850, 420];
      this.botDelay = delays[this.speedMode];
      document.getElementById('speed-label').textContent = labels[this.speedMode];
      sfx.click();
    });

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
          btnFullscreen.textContent = '🗗 Thu nhỏ';
        } else {
          document.exitFullscreen?.().catch(() => {});
          btnFullscreen.textContent = '⛶ Toàn màn hình';
        }
        sfx.click();
      });
    }

    this.btnSound.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      this.btnSound.textContent = sfx.enabled ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
      if (sfx.enabled) sfx.click();
    });

    this.btnRules.addEventListener('click', () => {
      this.modalRules.classList.remove('hidden');
      sfx.click();
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
    });
    document.getElementById('btn-ok-rules').addEventListener('click', () => {
      this.modalRules.classList.add('hidden');
    });

    this.btnResetCoins.addEventListener('click', () => {
      if (this.isMultiplayer && !this.isHost) return;
      this.players.forEach((p) => (p.coins = INITIAL_COINS));
      this.saveShopProfile();
      this.renderSeats();
      this.addLog(`Đã đặt lại số xu của cả bàn về ${INITIAL_COINS.toLocaleString()} xu.`, 'log-win');
      if (this.isMultiplayer && this.isHost) this.broadcastState();
      sfx.click();
    });

    window.addEventListener('keydown', (e) => {
      if (
        !this.modalSummary.classList.contains('hidden') ||
        !this.modalRules.classList.contains('hidden') ||
        !this.modalWifi.classList.contains('hidden') ||
        (this.modalShop && !this.modalShop.classList.contains('hidden'))
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!this.btnPlay.disabled) {
          e.preventDefault();
          this.onHumanPlay();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.onHumanHint();
      } else if (e.key === 'p' || e.key === 'P') {
        if (!this.btnPass.disabled) {
          e.preventDefault();
          this.onHumanPass();
        }
      } else if (e.code === 'Escape') {
        this.clearSelection();
      }
    });
  }

  // ============================================================================
  // WIFI MULTIPLAYER & PEERJS / LAN SYNC
  // ============================================================================
  isStaticCloudHost() {
    const h = window.location.hostname || '';
    return window.location.protocol === 'file:' || h.endsWith('github.io') || h.endsWith('netlify.app') || h.endsWith('vercel.app') || h.endsWith('web.app');
  }

  async refreshServerInfo() {
    if (this.isStaticCloudHost()) return;
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) this.lanServerIp = data.ip;
        if (data.port) this.lanServerPort = data.port;
        if (data.publicUrl) this.publicTunnelUrl = data.publicUrl;
      }
    } catch (_) {}
  }

  async detectLanInfoAndUrlRoom() {
    await this.refreshServerInfo();

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      document.getElementById('input-room-code').value = roomParam.toUpperCase();
      document.getElementById('input-player-name').value =
        'Người chơi ' + Math.floor(10 + Math.random() * 89);
      this.modalWifi.classList.remove('hidden');
      this.renderLobbyModal();
    }
  }

  getShareableRoomUrl(code) {
    return `https://thangdinhbkp-glitch.github.io/tien-len-mien-nam-bosskingpig/?room=${code}`;
  }

  async createWifiRoom() {
    await this.refreshServerInfo();
    const myName = document.getElementById('input-player-name').value.trim() || 'Chủ Phòng';
    const code = String(Math.floor(1000 + Math.random() * 9000));

    this.stopMultiplayerSync();
    this.isMultiplayer = true;
    this.isHost = true;
    this.roomId = code;
    this.mySeatId = 0;

    // Khởi tạo bàn WiFi: Ghế 0 là Chủ phòng, Ghế 1-2-3 để trống chờ bạn bè vào (hoặc bấm + Thêm Bot)
    this.players = [
      { id: 0, name: myName, avatar: this.equippedAvatar, cardSkin: this.equippedSkin, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: this.myClientId },
      { id: 1, name: 'Ghế trống 2', avatar: '🐯', cardSkin: 'classic', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Ghế trống 3', avatar: '🦊', cardSkin: 'classic', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Ghế trống 4', avatar: '🐼', cardSkin: 'classic', isBot: false, active: false, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
    ];

    document.getElementById('wifi-status-label').textContent = `Phòng ${code}`;
    document.getElementById('display-room-code').textContent = code;
    document.getElementById('share-link-input').value = this.getShareableRoomUrl(code);
    document.getElementById('wifi-room-box').classList.remove('hidden');

    this.initHostPeer(code);
    this.broadcastState();
    this.pollTimer = setInterval(() => this.pollRoomAsHost(), 350);
    this.renderLobbyModal();
    this.renderAll();
    sfx.win();
  }

  joinWifiRoom(code) {
    const myName = document.getElementById('input-player-name').value.trim() || 'Bạn bè';
    this.stopMultiplayerSync();
    this.isMultiplayer = true;
    this.isHost = false;
    this.roomId = code;

    document.getElementById('wifi-status-label').textContent = `Phòng ${code}`;
    document.getElementById('display-room-code').textContent = code;
    document.getElementById('share-link-input').value = this.getShareableRoomUrl(code);
    document.getElementById('wifi-room-box').classList.remove('hidden');

    // Gửi sự kiện JOIN qua cả Local WiFi API và PeerJS
    this.sendClientEvent({
      type: 'JOIN',
      clientId: this.myClientId,
      name: myName,
      avatar: this.equippedAvatar,
      cardSkin: this.equippedSkin,
      coins: this.savedCoins,
    });

    this.initGuestPeer(code, myName);
    this.pollTimer = setInterval(() => this.pollRoomAsGuest(), 350);
    this.renderLobbyModal();
    sfx.click();
  }

  switchToSoloBotMode() {
    this.stopMultiplayerSync();
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomId = null;
    this.mySeatId = 0;

    this.players = [
      { id: 0, name: 'Bạn', avatar: this.equippedAvatar, cardSkin: this.equippedSkin, isBot: false, active: true, hand: [], coins: this.savedCoins, passed: false, finishRank: null, clientId: 'host' },
      { id: 1, name: 'Bot Raiden Shogun', avatar: BOT_ANIME_AVATARS[1], cardSkin: 'sun_breathing', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 2, name: 'Bot Skirk', avatar: BOT_ANIME_AVATARS[2], cardSkin: 'cyber_waifu', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
      { id: 3, name: 'Bot Furina', avatar: BOT_ANIME_AVATARS[3], cardSkin: 'gojo_infinity', isBot: true, active: true, hand: [], coins: INITIAL_COINS, passed: false, finishRank: null, clientId: null },
    ];

    document.getElementById('wifi-status-label').textContent = 'Tạo phòng';
    document.getElementById('wifi-room-box').classList.add('hidden');
    this.startNewMatch(true);
  }

  stopMultiplayerSync() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.peerConnections = [];
    this.hostConn = null;
  }

  getPeerConfig() {
    return {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
      },
    };
  }

  // PeerJS P2P
  initHostPeer(code) {
    if (typeof Peer === 'undefined') {
      setTimeout(() => this.initHostPeer(code), 400);
      return;
    }
    try {
      this.peer = new Peer(`tlmn-bkp-room-${code}`, this.getPeerConfig());
      this.peer.on('connection', (conn) => {
        this.peerConnections.push(conn);
        conn.on('data', (evt) => {
          this.handleClientEventOnHost(evt);
        });
        conn.on('open', () => {
          conn.send(this.serializeRoomState());
        });
      });
    } catch (_) {}
  }

  initGuestPeer(code, myName) {
    if (typeof Peer === 'undefined') {
      setTimeout(() => this.initGuestPeer(code, myName), 400);
      return;
    }
    try {
      this.peer = new Peer(undefined, this.getPeerConfig());
      this.peer.on('open', () => {
        const connectToHost = () => {
          if (!this.isMultiplayer || this.isHost || !this.peer) return;
          const conn = this.peer.connect(`tlmn-bkp-room-${code}`, { reliable: true });
          this.hostConn = conn;
          conn.on('open', () => {
            conn.send({
              type: 'JOIN',
              clientId: this.myClientId,
              name: myName,
              avatar: this.equippedAvatar,
              cardSkin: this.equippedSkin,
              coins: this.savedCoins,
            });
          });
          conn.on('data', (stateObj) => {
            if (stateObj && stateObj.players) {
              this.applySyncedStateOnGuest(stateObj);
            }
          });
        };
        connectToHost();
      });
    } catch (_) {}
  }

  serializeRoomState() {
    return {
      roomId: this.roomId,
      matchCount: this.matchCount,
      lastWinnerId: this.lastWinnerId,
      currentTurn: this.currentTurn,
      currentCombo: this.currentCombo,
      previousCombo: this.previousCombo,
      trickOwnerId: this.trickOwnerId,
      mustPlay3Spade: this.mustPlay3Spade,
      isGameOver: this.isGameOver,
      turnBannerText: this.elTurnBanner.textContent,
      firstTurnBadgeText: this.elFirstTurnBadge.textContent,
      comboBannerText: !this.elComboAnnouncement.classList.contains('hidden')
        ? this.elComboAnnouncement.textContent
        : null,
      logsData: this.logsData.slice(0, 25),
      lastSummaryData: this.lastSummaryData,
      lastBurstEffect: this.lastBurstEffect,
      penaltyCardIds: this.penaltyCardIdsByPlayer.map((s) => Array.from(s)),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cardSkin: p.cardSkin || 'classic',
        isBot: p.isBot,
        active: p.active,
        hand: p.hand,
        coins: p.coins,
        passed: p.passed,
        finishRank: p.finishRank,
        clientId: p.clientId,
      })),
    };
  }

  async broadcastState() {
    if (!this.isMultiplayer || !this.isHost || !this.roomId) return;
    const stateObj = this.serializeRoomState();

    // 1. Gửi qua PeerJS P2P
    this.peerConnections.forEach((conn) => {
      try {
        if (conn.open) conn.send(stateObj);
      } catch (_) {}
    });

    // 2. Gửi qua Local WiFi Server (nếu chạy trên localhost)
    if (!this.isStaticCloudHost()) {
      try {
        await fetch(`/api/room/${this.roomId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateObj),
        });
      } catch (_) {}
    }
  }

  async sendClientEvent(evt) {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send(evt);
      } catch (_) {}
    }
    if (this.roomId && !this.isStaticCloudHost()) {
      try {
        await fetch(`/api/room/${this.roomId}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evt),
        });
      } catch (_) {}
    }
  }

  async pollRoomAsHost() {
    if (!this.isMultiplayer || !this.isHost || !this.roomId || this.isStaticCloudHost()) return;
    try {
      const res = await fetch(`/api/room/${this.roomId}/poll?host=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events) && data.events.length > 0) {
        data.events.forEach((evt) => this.handleClientEventOnHost(evt));
      }
    } catch (_) {}
  }

  async pollRoomAsGuest() {
    if (!this.isMultiplayer || this.isHost || !this.roomId || this.isStaticCloudHost()) return;
    try {
      const res = await fetch(`/api/room/${this.roomId}/poll?host=0`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== this.lastSyncedVersion && data.state && data.state.players) {
        this.lastSyncedVersion = data.version;
        this.applySyncedStateOnGuest(data.state);
      }
    } catch (_) {}
  }

  handleClientEventOnHost(evt) {
    if (!evt || !evt.type) return;

    if (evt.type === 'JOIN') {
      // Kiểm tra xem client này đã có ghế chưa
      let seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat) {
        seat = this.players.find((p) => !p.active);
      }
      if (seat) {
        seat.name = evt.name || `Người chơi ${seat.id + 1}`;
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        seat.isBot = false;
        seat.active = true;
        seat.clientId = evt.clientId;
        sfx.win();
        this.addLog(`👋 <strong>${seat.name}</strong> đã vào bàn (Ghế #${seat.id + 1})!`, 'log-win');
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'UPDATE_COSMETICS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (seat) {
        if (evt.avatar) seat.avatar = evt.avatar;
        if (evt.cardSkin) seat.cardSkin = evt.cardSkin;
        if (typeof evt.coins === 'number') seat.coins = evt.coins;
        this.renderLobbyModal();
        this.renderAll();
        this.broadcastState();
      }
    } else if (evt.type === 'PLAY_CARDS') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver) return;
      const cardIdSet = new Set(evt.cardIds || []);
      const chosenCards = seat.hand.filter((c) => cardIdSet.has(c.id));
      const combo = classifyCombo(chosenCards);
      if (combo) {
        this.playCombo(seat, combo);
      }
    } else if (evt.type === 'PASS_TURN') {
      const seat = this.players.find((p) => p.clientId === evt.clientId);
      if (!seat || this.currentTurn !== seat.id || this.isGameOver || !this.currentCombo) return;
      this.passTurn(seat);
    }
  }

  applySyncedStateOnGuest(state) {
    this.matchCount = state.matchCount || 1;
    this.currentTurn = state.currentTurn || 0;
    this.currentCombo = state.currentCombo || null;
    this.previousCombo = state.previousCombo || null;
    this.trickOwnerId = state.trickOwnerId;
    this.mustPlay3Spade = !!state.mustPlay3Spade;
    const wasGameOver = this.isGameOver;
    this.isGameOver = !!state.isGameOver;

    if (Array.isArray(state.players)) {
      this.players = state.players;
      const me = this.players.find((p) => p.clientId === this.myClientId);
      if (me) {
        this.mySeatId = me.id;
        this.saveShopProfile();
      }
    }

    if (Array.isArray(state.penaltyCardIds)) {
      this.penaltyCardIdsByPlayer = state.penaltyCardIds.map((arr) => new Set(arr));
    }

    if (state.firstTurnBadgeText) {
      this.elFirstTurnBadge.textContent = state.firstTurnBadgeText;
    }
    this.elMatchInfo.textContent = `Ván #${this.matchCount} • Phòng WiFi ${this.roomId}`;

    if (this.currentTurn === this.mySeatId && !this.isGameOver) {
      this.elTurnBanner.textContent = this.currentCombo
        ? `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt.`
        : '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ.';
    } else if (state.turnBannerText) {
      this.elTurnBanner.textContent = state.turnBannerText;
    }

    if (state.comboBannerText) {
      this.showComboBanner(state.comboBannerText);
    }

    if (Array.isArray(state.logsData)) {
      this.logsData = state.logsData;
      this.elGameLog.innerHTML = this.logsData
        .map((l) => `<div class="log-item ${l.cssClass}">${l.message}</div>`)
        .join('');
    }

    if (state.lastBurstEffect && state.lastBurstEffect.id !== this.lastShownBurstId) {
      this.lastShownBurstId = state.lastBurstEffect.id;
      const burst = state.lastBurstEffect;
      if (burst.type === 'raiden') {
        this.triggerGenshinBurst('raiden', burst.detail);
      } else if (burst.type === 'skirk') {
        this.triggerGenshinBurst('skirk', burst.detail, () => {
          if (this.isGameOver && state.lastSummaryData) {
            this.showSummaryModal(
              state.lastSummaryData.coinChanges,
              state.lastSummaryData.detailsByPlayer,
              state.lastSummaryData.bannerTitle
            );
          }
        });
      }
    }

    if (this.isGameOver && state.lastSummaryData) {
      this.btnShowSummary.classList.remove('hidden');
      if (!wasGameOver && (!state.lastBurstEffect || state.lastBurstEffect.type !== 'skirk')) {
        sfx.win();
        this.showSummaryModal(
          state.lastSummaryData.coinChanges,
          state.lastSummaryData.detailsByPlayer,
          state.lastSummaryData.bannerTitle
        );
      }
    } else if (!this.isGameOver) {
      this.modalSummary.classList.add('hidden');
      this.btnShowSummary.classList.add('hidden');
    }

    // Tự động đóng bảng chờ nếu chủ phòng đã bắt đầu chia bài
    const me = this.players[this.mySeatId];
    if (me && me.hand && me.hand.length > 0 && !this.isGameOver && !this.modalWifi.classList.contains('hidden')) {
      this.modalWifi.classList.add('hidden');
    }

    this.renderLobbyModal();
    this.renderAll();
  }

  renderLobbyModal() {
    const grid = document.getElementById('lobby-seats-grid');
    if (!grid) return;

    const activePlayers = this.players.filter((p) => p.active);
    document.getElementById('lobby-player-count').textContent = activePlayers.length;

    const startBtn = document.getElementById('btn-start-wifi-match');
    if (this.isHost && this.isMultiplayer) {
      startBtn.disabled = activePlayers.length < 2;
      startBtn.textContent =
        activePlayers.length >= 2
          ? `🃏 Bắt Đầu Chia Bài (${activePlayers.length} người)`
          : '⏳ Đang chờ ít nhất 2 người...';
    } else if (this.isMultiplayer && !this.isHost) {
      startBtn.disabled = true;
      startBtn.textContent = '⏳ Chờ Chủ phòng bắt đầu ván bài...';
    } else {
      startBtn.disabled = true;
      startBtn.textContent = 'Hãy bấm "Tạo Phòng Mới" trước';
    }

    grid.innerHTML = this.players
      .map((p, idx) => {
        const isMe = p.id === this.mySeatId && this.isMultiplayer;
        let actionHtml = '';
        if (this.isHost && this.isMultiplayer && idx > 0) {
          if (!p.active) {
            actionHtml = `<button class="tool-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, true)">🤖 + Thêm Bot</button>`;
          } else {
            actionHtml = `<button class="clear-log-btn" onclick="window.tienLenGame.toggleBotInLobby(${idx}, false)">✕ Bỏ ghế</button>`;
          }
        }

        const roleLabel = !p.active
          ? 'Ghế trống (Đang chờ bạn bè vào...)'
          : idx === 0
          ? '👑 Chủ phòng'
          : p.isBot
          ? '🤖 Máy (Bot AI)'
          : '👤 Người chơi qua WiFi';

        return `
          <div class="lobby-seat-card ${p.active ? 'occupied' : ''}">
            <div class="lobby-seat-info">
              <span class="lobby-seat-avatar" style="display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;">${getAvatarHtml(p.avatar)}</span>
              <div>
                <div class="lobby-seat-name">${p.active ? p.name : `Ghế #${idx + 1} (Trống)`} ${
          isMe ? '(Bạn)' : ''
        }</div>
                <div class="lobby-seat-role">${roleLabel}</div>
              </div>
            </div>
            <div>${actionHtml}</div>
          </div>
        `;
      })
      .join('');
  }

  toggleBotInLobby(seatIdx, addBot) {
    if (!this.isHost || seatIdx <= 0 || seatIdx > 3) return;
    const botNames = ['', 'Bot Raiden Shogun', 'Bot Skirk', 'Bot Furina'];
    const botSkins = ['', 'sun_breathing', 'cyber_waifu', 'gojo_infinity'];
    const p = this.players[seatIdx];
    if (addBot) {
      p.active = true;
      p.isBot = true;
      p.name = botNames[seatIdx];
      p.avatar = BOT_ANIME_AVATARS[seatIdx];
      p.cardSkin = botSkins[seatIdx];
      p.clientId = null;
    } else {
      p.active = false;
      p.isBot = false;
      p.name = `Ghế trống ${seatIdx + 1}`;
      p.clientId = null;
      p.hand = [];
    }
    sfx.click();
    this.renderLobbyModal();
    this.renderAll();
    this.broadcastState();
  }

  // ============================================================================
  // LOGS & BANNERS
  // ============================================================================
  addLog(message, cssClass = '') {
    this.logsData.unshift({ message, cssClass });
    const item = document.createElement('div');
    item.className = `log-item ${cssClass}`;
    item.innerHTML = message;
    this.elGameLog.prepend(item);
  }

  showComboBanner(text) {
    this.elComboAnnouncement.textContent = text;
    this.elComboAnnouncement.classList.remove('hidden');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.elComboAnnouncement.classList.add('hidden');
    }, 2400);
  }

  // ============================================================================
  // CORE MATCH FLOW (SUPPORTS 2 TO 4 ACTIVE PLAYERS)
  // ============================================================================
  getActivePlayers() {
    return this.players.filter((p) => p.active);
  }

  startNewMatch(resetHistory = false) {
    clearTimeout(this.botTimer);
    this.modalSummary.classList.add('hidden');
    this.btnShowSummary.classList.add('hidden');

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      this.elTurnBanner.textContent = '⏳ Cần tối thiểu 2 người chơi trong phòng WiFi để chia bài!';
      this.renderAll();
      return;
    }

    if (resetHistory) {
      this.matchCount = 1;
      this.lastWinnerId = null;
    } else {
      this.matchCount++;
    }

    const deck = shuffleDeck(createDeck());
    let dealOffset = 0;
    this.players.forEach((p) => {
      if (p.active) {
        const rawHand = deck.slice(dealOffset * 13, (dealOffset + 1) * 13);
        dealOffset++;
        p.hand = sortHandByMode(rawHand, p.id === this.mySeatId ? this.sortMode : 'asc');
      } else {
        p.hand = [];
      }
      p.passed = false;
      p.finishRank = null;
    });

    this.currentCombo = null;
    this.previousCombo = null;
    this.trickOwnerId = null;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    this.penaltyCardIdsByPlayer = [new Set(), new Set(), new Set(), new Set()];
    this.matchChopCoins = [0, 0, 0, 0];
    this.matchChopDetails = [[], [], [], []];
    this.lastSummaryData = null;
    this.logsData = [];
    this.hintIndex = 0;
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;
    this.isGameOver = false;

    this.elGameLog.innerHTML = '';
    this.elMatchInfo.textContent = this.isMultiplayer
      ? `Ván #${this.matchCount} • Phòng WiFi ${this.roomId} (${activePlayers.length} người)`
      : `Ván #${this.matchCount} • Luật Đếm Lá (Nhất Ăn Tất)`;

    const isFirstMatch = this.lastWinnerId === null || !this.players[this.lastWinnerId]?.active;
    if (isFirstMatch) {
      // Tìm người có quân bài nhỏ nhất trên bàn (ưu tiên 3♠) để đi trước
      let lowestPlayer = activePlayers[0];
      let lowestCardVal = 999;
      activePlayers.forEach((p) => {
        p.hand.forEach((c) => {
          if (c.value < lowestCardVal) {
            lowestCardVal = c.value;
            lowestPlayer = p;
          }
        });
      });

      this.currentTurn = lowestPlayer.id;
      this.mustPlay3Spade = false;
      const has3Spade = lowestCardVal === 0;
      this.elFirstTurnBadge.textContent = has3Spade
        ? `♠️ Ván đầu: ${lowestPlayer.name} có 3♠ đi trước`
        : `♠️ Ván đầu: ${lowestPlayer.name} có bài nhỏ nhất đi trước`;
      this.addLog(
        `<strong>Ván #${this.matchCount} (${activePlayers.length} người)</strong> bắt đầu! <strong>${lowestPlayer.name}</strong> đi trước.`,
        'log-win'
      );
    } else {
      this.currentTurn = this.lastWinnerId;
      this.mustPlay3Spade = false;
      this.elFirstTurnBadge.textContent = `👑 Chủ bàn: ${this.players[this.currentTurn].name} đi trước`;
      this.addLog(
        `<strong>Ván #${this.matchCount}</strong> bắt đầu! <strong>${this.players[this.currentTurn].name}</strong> (Về Nhất ván trước) đi trước.`,
        'log-win'
      );
    }

    this.renderAll();

    // Kiểm tra Tới Trắng
    for (let offset = 0; offset < 4; offset++) {
      const pid = (this.currentTurn + offset) % 4;
      const p = this.players[pid];
      if (!p.active) continue;
      const reason = checkToiTrang(p.hand, isFirstMatch);
      if (reason) {
        this.handleToiTrang(pid, reason);
        return;
      }
    }

    this.promptCurrentTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
  }

  handleToiTrang(winnerId, reason) {
    this.isGameOver = true;
    this.btnShowSummary.classList.remove('hidden');
    const winner = this.players[winnerId];
    sfx.win();
    this.showComboBanner(`🎉 TỚI TRẮNG: ${reason.toUpperCase()}!`);
    this.addLog(
      `⚡ <strong>${winner.name}</strong> <strong>TỚI TRẮNG</strong> với <strong>${reason}</strong>! Cả bàn lật bài tính tiền phạt!`,
      'log-win'
    );

    const coinChanges = [0, 0, 0, 0];
    const detailsByPlayer = [[], [], [], []];
    let totalWon = 0;

    this.players.forEach((p) => {
      if (!p.active) return;
      if (p.id === winnerId) {
        p.finishRank = 1;
      } else {
        p.finishRank = 2;
        const analysis = analyzeLoserHand(p.hand, false);
        const specialOnly =
          analysis.totalPenalty - (p.hand.length === 13 ? 520 : p.hand.length * 20);
        const loss = 300 + Math.max(0, specialOnly);
        coinChanges[p.id] = -loss;
        p.coins -= loss;
        totalWon += loss;
        this.penaltyCardIdsByPlayer[p.id] = analysis.penaltyCardIds;
        detailsByPlayer[p.id] = [
          { label: 'Bị Tới Trắng (-300)', isSpecial: true },
          ...analysis.breakdown.slice(1),
        ];
      }
    });

    coinChanges[winnerId] = totalWon;
    winner.coins += totalWon;
    detailsByPlayer[winnerId] = [
      { label: `Tới trắng: ${reason} (+${totalWon})`, isGood: true },
    ];

    this.lastWinnerId = winnerId;
    const bannerTitle = `🎉 ${winner.name} TỚI TRẮNG (${reason}) - ĂN TRỌN +${totalWon} XU!`;
    this.lastSummaryData = { coinChanges, detailsByPlayer, bannerTitle };
    const burstDetail = `👑 ${winner.name} Tới Trắng (${reason}) • +${totalWon} Xu!`;
    this.lastBurstEffect = { id: Date.now(), type: 'skirk', detail: burstDetail };
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    this.triggerGenshinBurst('skirk', burstDetail, () => {
      this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
    });
  }

  canPlayerCutWithFourPairs(player) {
    if (!player.active || !this.currentCombo || player.hand.length < 8) return false;
    const moves = getValidMoves(player.hand, this.currentCombo, false, true);
    return moves.length > 0;
  }

  promptCurrentTurn() {
    if (this.isGameOver) return;

    const currentPlayer = this.players[this.currentTurn];
    this.renderAll();

    if (this.isMultiplayer && !this.isHost) {
      return;
    }

    if (currentPlayer.isBot) {
      this.elTurnBanner.textContent = `⏳ Đang đợi ${currentPlayer.name} suy nghĩ...`;
      this.botTimer = setTimeout(() => this.executeBotTurn(currentPlayer), this.botDelay);
    } else if (currentPlayer.id === this.mySeatId) {
      if (!this.currentCombo) {
        this.elTurnBanner.textContent = '👉 Lượt của bạn mở vòng mới! Bạn được đánh bộ bất kỳ.';
      } else if (currentPlayer.passed && this.canPlayerCutWithFourPairs(currentPlayer)) {
        this.elTurnBanner.textContent = '🔥 Bạn có 4 ĐÔI THÔNG! Có thể chặt không cần vòng hoặc Bỏ qua.';
      } else {
        this.elTurnBanner.textContent = `👉 Lượt của bạn! Đánh chặn ${this.currentCombo.label} hoặc Bỏ lượt.`;
      }
      this.updateHumanActionButtons();
    } else {
      this.elTurnBanner.textContent = `⏳ Đang tới lượt của ${currentPlayer.name}...`;
    }
  }

  playCombo(player, combo) {
    const beatCheck = canBeatCombo(combo, this.currentCombo);
    if (!beatCheck.ok) return false;

    const playedIds = new Set(combo.cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !playedIds.has(c.id));

    if (
      beatCheck.isChop &&
      this.currentCombo &&
      this.trickOwnerId !== null &&
      this.trickOwnerId !== player.id
    ) {
      sfx.chop();
      const victim = this.players[this.trickOwnerId];
      let chopValue = 100;
      if (this.currentCombo.type === COMBO_TYPES.SINGLE && this.currentCombo.highRank === 12) {
        chopValue = this.currentCombo.highCard.isRed ? 100 : 50;
      } else if (this.currentCombo.type === COMBO_TYPES.PAIR && this.currentCombo.highRank === 12) {
        chopValue = 200;
      } else {
        chopValue = 150;
      }

      if (this.lastChoppedPlayerId !== null && this.chopPot > 0) {
        const prevVictim = this.players[this.lastChoppedPlayerId];
        prevVictim.coins += this.chopPot;
        victim.coins -= this.chopPot;
        this.matchChopCoins[prevVictim.id] += this.chopPot;
        this.matchChopCoins[victim.id] -= this.chopPot;
        this.matchChopDetails[victim.id].push({
          label: `💸 Đền chặt chồng (-${this.chopPot})`,
          isSpecial: true,
        });
      }

      this.chopPot += chopValue;
      this.lastChoppedPlayerId = victim.id;

      victim.coins -= chopValue;
      player.coins += chopValue;
      this.matchChopCoins[victim.id] -= chopValue;
      this.matchChopCoins[player.id] += chopValue;
      this.matchChopDetails[victim.id].push({
        label: `💸 Bị ${player.name} chặt ${this.currentCombo.label} (-${chopValue})`,
        isSpecial: true,
      });
      this.matchChopDetails[player.id].push({
        label: `💥 Chặt ${this.currentCombo.label} của ${victim.name} (+${chopValue})`,
        isGood: true,
      });

      const chopBurstDetail = `⚡ ${player.name} tung ${combo.label} chặt ${this.currentCombo.label} của ${victim.name} (+${chopValue} xu)!`;
      this.lastBurstEffect = { id: Date.now(), type: 'raiden', detail: chopBurstDetail };
      this.triggerGenshinBurst('raiden', chopBurstDetail);
      this.showComboBanner(`💥 CHẶT HEO/HÀNG! +${chopValue} XU`);
      this.addLog(
        `💥 <strong>${player.name}</strong> tung <strong>${combo.label}</strong> chặt <strong>${this.currentCombo.label}</strong> của <strong>${victim.name}</strong> (+${chopValue} xu)!`,
        'log-chop'
      );
      this.saveShopProfile();
    } else {
      sfx.playCard();
      if (
        combo.type === COMBO_TYPES.FOUR_OF_A_KIND ||
        combo.type === COMBO_TYPES.THREE_PAIRS ||
        combo.type === COMBO_TYPES.FOUR_PAIRS ||
        (combo.highRank === 12 && combo.length >= 2)
      ) {
        this.showComboBanner(`🔥 ${combo.label.toUpperCase()}!`);
      }
      this.addLog(
        `<strong>${player.name}</strong> đánh <strong>${combo.label}</strong> (${combo.cards
          .map((c) => `${c.rank}${c.suit}`)
          .join(' ')})`,
        'log-play'
      );
    }

    combo.ownerSkin = player.cardSkin || 'classic';
    this.previousCombo = this.currentCombo;
    this.currentCombo = combo;
    this.trickOwnerId = player.id;
    this.mustPlay3Spade = false;
    this.hintIndex = 0;
    player.passed = false;

    // Kiểm tra người chơi vừa hết bài -> NHẤT ĂN TẤT (WIN LUÔN)
    if (player.hand.length === 0) {
      player.finishRank = 1;
      this.players.forEach((p) => {
        if (p.active && p.id !== player.id) p.finishRank = 2;
      });
      const wonBy3Spade = combo.cards.some((c) => c.value === 0);
      sfx.win();
      if (wonBy3Spade) {
        this.showComboBanner(`👑 ${player.name.toUpperCase()} ĐÚT 3 BÍCH VỀ NHẤT!`);
        this.addLog(
          `👑 <strong>${player.name}</strong> đánh <strong>3♠</strong> ở nước cuối cùng — <strong>ĐÚT 3 BÍCH VỀ NHẤT</strong>! Cả bàn bị phạt nặng!`,
          'log-win'
        );
      } else {
        this.showComboBanner(`🏆 ${player.name.toUpperCase()} VỀ NHẤT - WIN LUÔN!`);
        this.addLog(
          `🏁 <strong>${player.name}</strong> đã hết bài và <strong>Về Nhất (Thắng cuộc)</strong>! Toàn bộ người thua lật bài đếm lá!`,
          'log-win'
        );
      }

      this.endMatch(player.id, wonBy3Spade);
      return true;
    }

    this.advanceTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
    return true;
  }

  passTurn(player) {
    sfx.pass();
    player.passed = true;
    this.addLog(`<em>${player.name} bỏ lượt.</em>`, 'log-pass');
    this.advanceTurn();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }
  }

  advanceTurn() {
    if (this.isGameOver) return;

    const othersCanAct = this.players.filter((p) => {
      if (!p.active || p.id === this.trickOwnerId) return false;
      if (p.finishRank !== null) return false;
      if (!p.passed) return true;
      return this.canPlayerCutWithFourPairs(p);
    });

    if (othersCanAct.length === 0) {
      this.startNewRoundAfterAllPass();
      return;
    }

    for (let step = 1; step <= 4; step++) {
      const nextId = (this.currentTurn + step) % 4;
      const nextPlayer = this.players[nextId];
      if (!nextPlayer.active || nextPlayer.finishRank !== null) continue;
      if (!nextPlayer.passed || this.canPlayerCutWithFourPairs(nextPlayer)) {
        this.currentTurn = nextId;
        this.promptCurrentTurn();
        return;
      }
    }

    this.startNewRoundAfterAllPass();
  }

  startNewRoundAfterAllPass() {
    this.players.forEach((p) => (p.passed = false));
    this.currentCombo = null;
    this.previousCombo = null;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    this.chopPot = 0;
    this.lastChoppedPlayerId = null;

    let leaderId = this.trickOwnerId;
    const owner = this.players[leaderId];

    if (!owner || !owner.active || owner.finishRank !== null) {
      for (let step = 1; step <= 4; step++) {
        const candidateId = (leaderId + step) % 4;
        if (this.players[candidateId].active && this.players[candidateId].finishRank === null) {
          leaderId = candidateId;
          break;
        }
      }
    } else {
      this.addLog(`🔄 Vòng mới! <strong>${owner.name}</strong> làm cái đánh tiếp.`, 'log-play');
    }

    this.trickOwnerId = null;
    this.currentTurn = leaderId;
    this.promptCurrentTurn();
  }

  // ============================================================================
  // BOT AI DECISION ENGINE
  // ============================================================================
  executeBotTurn(bot) {
    if (this.isGameOver) return;

    const onlyFourPairs = bot.passed && this.canPlayerCutWithFourPairs(bot);
    const validMoves = getValidMoves(bot.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);

    if (validMoves.length === 0) {
      this.passTurn(bot);
      return;
    }

    if (!this.currentCombo) {
      const chosen = this.chooseBotLeadMove(bot, validMoves);
      this.playCombo(bot, chosen);
      return;
    }

    const chosen = this.chooseBotResponseMove(bot, validMoves);
    if (chosen) {
      this.playCombo(bot, chosen);
    } else {
      this.passTurn(bot);
    }
  }

  chooseBotLeadMove(bot, validMoves) {
    const instantWin = validMoves.find((m) => m.length === bot.hand.length);
    if (instantWin) return instantWin;

    const minOpponentCards = Math.min(
      ...this.players
        .filter((p) => p.active && p.id !== bot.id && p.finishRank === null)
        .map((p) => p.hand.length)
    );

    const nonBombMoves = validMoves.filter((m) => !m.isBomb);
    const pool = nonBombMoves.length > 0 ? nonBombMoves : validMoves;

    const scored = pool.map((move) => {
      let score = 0;
      const contains3Spade = move.cards.some((c) => c.value === 0);

      if (move.type === COMBO_TYPES.STRAIGHT) score += 45 + move.length * 7;
      else if (move.type === COMBO_TYPES.TRIPLE) score += 38;
      else if (move.type === COMBO_TYPES.PAIR) score += 28;
      else if (move.type === COMBO_TYPES.SINGLE) score += 15;

      if (contains3Spade && minOpponentCards <= 6) {
        score += 45;
      }

      if (minOpponentCards === 1 && move.type === COMBO_TYPES.SINGLE) {
        score += move.highValue * 0.6;
      } else {
        score -= move.highValue * 0.8;
      }

      if (move.highRank === 12 && bot.hand.length > 3) {
        score -= 60;
      }

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  chooseBotResponseMove(bot, validMoves) {
    const instantWin = validMoves.find((m) => m.length === bot.hand.length);
    if (instantWin) return instantWin;

    const chopMoves = validMoves.filter((m) => canBeatCombo(m, this.currentCombo).isChop);
    if (chopMoves.length > 0) {
      chopMoves.sort((a, b) => a.highValue - b.highValue);
      return chopMoves[0];
    }

    const owner = this.players[this.trickOwnerId];
    const ownerLowCards = owner && owner.hand.length <= 3;

    const quadRanks = new Set();
    const rankCounts = new Array(13).fill(0);
    bot.hand.forEach((c) => rankCounts[c.rankIndex]++);
    rankCounts.forEach((cnt, r) => {
      if (cnt === 4) quadRanks.add(r);
    });

    let safeMoves = validMoves.filter(
      (m) => m.isBomb || !m.cards.some((c) => quadRanks.has(c.rankIndex))
    );
    if (safeMoves.length === 0) safeMoves = validMoves;

    safeMoves.sort((a, b) => a.highValue - b.highValue);
    const smallest = safeMoves[0];

    if (
      smallest.highRank === 12 &&
      this.currentCombo.highRank <= 8 &&
      bot.hand.length > 6 &&
      !ownerLowCards
    ) {
      return null;
    }

    return smallest;
  }

  // ============================================================================
  // HUMAN INTERACTION (LOCAL PLAYER AT mySeatId)
  // ============================================================================
  getLocalPlayer() {
    return this.players[this.mySeatId] || this.players[0];
  }

  toggleCardSelection(cardId) {
    if (this.isGameOver) return;
    const human = this.getLocalPlayer();
    const clickedCard = human.hand.find((c) => c.id === cardId);
    if (!clickedCard) return;

    // 1. NẾU MÌNH LÀ NGƯỜI ĐI TRƯỚC (MỞ VÒNG MỚI): đánh lẻ khi chọn 1 lá
    if (!this.currentCombo) {
      this.companionCardIds.clear();
      if (this.selectedCardIds.has(cardId)) {
        this.selectedCardIds.delete(cardId);
      } else {
        this.selectedCardIds.add(cardId);
      }
      sfx.click();
      this.renderHumanHand();
      this.updateHumanActionButtons();
      return;
    }

    // 2. NẾU ĐỐI THỦ ĐI TRƯỚC: tự động gợi ý & nhấc bộ bài đi kèm lá vừa chọn
    if (this.selectedCardIds.has(cardId)) {
      this.selectedCardIds.delete(cardId);
      if (this.selectedCardIds.size === 0) {
        this.companionCardIds.clear();
      }
      sfx.click();
      this.renderHumanHand();
      this.updateHumanActionButtons();
      return;
    }

    const currentSelected = this.getSelectedCards();
    if (currentSelected.length > 0) {
      const manualCandidate = classifyCombo([...currentSelected, clickedCard]);
      const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
      if (
        manualCandidate &&
        (!onlyFourPairs || manualCandidate.type === COMBO_TYPES.FOUR_PAIRS) &&
        canBeatCombo(manualCandidate, this.currentCombo).ok
      ) {
        this.selectedCardIds.add(cardId);
        sfx.click();
        this.renderHumanHand();
        this.updateHumanActionButtons();
        return;
      }
    }

    const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
    const validMoves = getValidMoves(
      human.hand,
      this.currentCombo,
      this.mustPlay3Spade,
      onlyFourPairs,
      clickedCard
    );
    const movesWithClicked = validMoves.filter((m) =>
      m.cards.some((c) => c.id === clickedCard.id)
    );

    if (movesWithClicked.length > 0) {
      movesWithClicked.sort((a, b) => {
        const aSameType = a.type === this.currentCombo.type ? 0 : 1;
        const bSameType = b.type === this.currentCombo.type ? 0 : 1;
        if (aSameType !== bSameType) return aSameType - bSameType;
        return a.length - b.length || a.highValue - b.highValue;
      });

      const bestMove = movesWithClicked[0];
      this.selectedCardIds = new Set(bestMove.cards.map((c) => c.id));

      this.companionCardIds.clear();
      movesWithClicked.forEach((m) => {
        m.cards.forEach((c) => {
          if (c.id !== clickedCard.id) {
            this.companionCardIds.add(c.id);
          }
        });
      });
    } else {
      this.selectedCardIds = new Set([cardId]);
      this.companionCardIds.clear();
    }

    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  clearSelection() {
    this.selectedCardIds.clear();
    this.companionCardIds.clear();
    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  toggleSortMode() {
    this.sortMode = this.sortMode === 'asc' ? 'combo' : 'asc';
    document.getElementById('sort-mode-label').textContent =
      this.sortMode === 'asc' ? 'Tăng dần' : 'Theo Bộ';
    const human = this.getLocalPlayer();
    human.hand = sortHandByMode(human.hand, this.sortMode);
    sfx.click();
    this.renderHumanHand();
  }

  onHumanHint() {
    const human = this.getLocalPlayer();
    const onlyFourPairs = human.passed && this.canPlayerCutWithFourPairs(human);
    const validMoves = getValidMoves(human.hand, this.currentCombo, this.mustPlay3Spade, onlyFourPairs);

    if (validMoves.length === 0) {
      this.elSelectedPreview.textContent = 'Không có bộ bài nào chặn được!';
      this.elSelectedPreview.classList.add('invalid');
      sfx.pass();
      return;
    }

    validMoves.sort((a, b) => a.length - b.length || a.highValue - b.highValue);
    const pick = validMoves[this.hintIndex % validMoves.length];
    this.hintIndex++;

    this.selectedCardIds = new Set(pick.cards.map((c) => c.id));
    sfx.click();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }

  getSelectedCards() {
    const human = this.getLocalPlayer();
    return human.hand.filter((c) => this.selectedCardIds.has(c.id));
  }

  updateHumanActionButtons() {
    const human = this.getLocalPlayer();
    const isMyTurn = !this.isGameOver && this.currentTurn === this.mySeatId;
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);

    if (selectedCards.length === 0) {
      this.elSelectedPreview.textContent = 'Chọn bài để đánh';
      this.elSelectedPreview.classList.remove('invalid');
    } else if (!combo) {
      this.elSelectedPreview.textContent = `⚠️ ${selectedCards.length} lá đang chọn chưa tạo thành bộ hợp lệ`;
      this.elSelectedPreview.classList.add('invalid');
    } else {
      this.elSelectedPreview.textContent = `✅ Đang chọn: ${combo.label}`;
      this.elSelectedPreview.classList.remove('invalid');
    }

    if (!isMyTurn) {
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.btnPass.disabled = this.currentCombo === null;

    if (!combo) {
      this.btnPlay.disabled = true;
      return;
    }

    if (human.passed && combo.type !== COMBO_TYPES.FOUR_PAIRS) {
      this.btnPlay.disabled = true;
      return;
    }

    const canBeat = canBeatCombo(combo, this.currentCombo);
    this.btnPlay.disabled = !canBeat.ok;
    if (!canBeat.ok && this.currentCombo) {
      this.elSelectedPreview.textContent = `⚠️ ${combo.label} chưa đủ mạnh để đè ${this.currentCombo.label}`;
      this.elSelectedPreview.classList.add('invalid');
    }
  }

  onHumanPlay() {
    if (this.isGameOver || this.currentTurn !== this.mySeatId) return;
    const selectedCards = this.getSelectedCards();
    const combo = classifyCombo(selectedCards);
    if (!combo) return;

    const cardIds = combo.cards.map((c) => c.id);
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      this.sendClientEvent({
        type: 'PLAY_CARDS',
        clientId: this.myClientId,
        cardIds,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.playCombo(this.getLocalPlayer(), combo);
  }

  onHumanPass() {
    if (this.isGameOver || this.currentTurn !== this.mySeatId || !this.currentCombo) return;
    this.selectedCardIds.clear();
    this.companionCardIds.clear();

    if (this.isMultiplayer && !this.isHost) {
      this.sendClientEvent({
        type: 'PASS_TURN',
        clientId: this.myClientId,
      });
      this.btnPlay.disabled = true;
      this.btnPass.disabled = true;
      return;
    }

    this.passTurn(this.getLocalPlayer());
  }

  // ============================================================================
  // END OF MATCH & SCORING (NHẤT ĂN TẤT - ĐẾM LÁ + THỐI HEO/HÀNG/3♠ + ĐÚT 3♠)
  // ============================================================================
  endMatch(winnerId, wonBy3Spade = false) {
    this.isGameOver = true;
    this.btnShowSummary.classList.remove('hidden');
    clearTimeout(this.botTimer);

    const winner = this.players[winnerId];
    const coinChanges = [0, 0, 0, 0];
    const detailsByPlayer = [[], [], [], []];
    let totalWinnerGain = 0;

    this.players.forEach((p) => {
      if (!p.active || p.id === winnerId) return;

      const analysis = analyzeLoserHand(p.hand, wonBy3Spade);
      const loss = analysis.totalPenalty;
      this.penaltyCardIdsByPlayer[p.id] = analysis.penaltyCardIds;
      detailsByPlayer[p.id] = [...this.matchChopDetails[p.id], ...analysis.breakdown];

      p.coins -= loss;
      coinChanges[p.id] = this.matchChopCoins[p.id] - loss;
      totalWinnerGain += loss;

      const detailText = analysis.breakdown.map((b) => b.label).join(', ');
      this.addLog(
        `🃏 <strong>${p.name}</strong> lật bài (${p.hand
          .map((c) => `${c.rank}${c.suit}`)
          .join(' ')}): ${detailText} ➔ <strong>-${loss} xu</strong>`,
        'log-chop'
      );
    });

    winner.coins += totalWinnerGain;
    coinChanges[winnerId] = this.matchChopCoins[winnerId] + totalWinnerGain;
    detailsByPlayer[winnerId] = [
      ...this.matchChopDetails[winnerId],
      {
        label: wonBy3Spade
          ? `👑 Đút 3♠ Về Nhất (+${totalWinnerGain} xu)`
          : `🏆 Về Nhất ăn tất (+${totalWinnerGain} xu)`,
        isGood: true,
      },
    ];

    this.lastWinnerId = winnerId;
    this.elTurnBanner.textContent = `🏁 ${winner.name} Về Nhất (+${totalWinnerGain} xu)! Đã lật bài toàn bàn.`;

    const bannerTitle = wonBy3Spade
      ? `👑 ${winner.name.toUpperCase()} ĐÚT 3 BÍCH VỀ NHẤT — ĂN TRỌN +${totalWinnerGain} XU!`
      : `🏆 ${winner.name.toUpperCase()} VỀ NHẤT — ĂN TRỌN +${totalWinnerGain} XU!`;

    const winBurstDetail = wonBy3Spade
      ? `👑 ${winner.name} Đút 3♠ Về Nhất • +${totalWinnerGain} Xu!`
      : `🏆 ${winner.name} Về Nhất Ăn Tất • +${totalWinnerGain} Xu!`;
    this.lastBurstEffect = { id: Date.now(), type: 'skirk', detail: winBurstDetail };
    this.lastSummaryData = { coinChanges, detailsByPlayer, bannerTitle };
    this.checkAndTriggerAutoRelief();
    this.saveShopProfile();

    this.renderAll();
    if (this.isMultiplayer && this.isHost) {
      this.broadcastState();
    }

    this.triggerGenshinBurst('skirk', winBurstDetail, () => {
      this.showSummaryModal(coinChanges, detailsByPlayer, bannerTitle);
    });
  }

  showSummaryModal(coinChanges, detailsByPlayer, bannerText) {
    const tbody = document.getElementById('summary-tbody');
    const banner = document.getElementById('toi-trang-banner');

    if (bannerText) {
      banner.textContent = bannerText;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    const sortedPlayers = this.players
      .filter((p) => p.active)
      .sort((a, b) => {
        if (a.finishRank !== b.finishRank) return (a.finishRank || 2) - (b.finishRank || 2);
        return coinChanges[a.id] - coinChanges[b.id];
      });

    tbody.innerHTML = sortedPlayers
      .map((p) => {
        const isWinner = p.finishRank === 1;
        const delta = coinChanges[p.id];
        const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
        const deltaClass = delta >= 0 ? 'coin-plus' : 'coin-minus';
        const penSet = this.penaltyCardIdsByPlayer[p.id] || new Set();

        const cardsHtml =
          p.hand.length === 0
            ? `<span class="penalty-chip good">✨ Đã hết sạch bài (0 lá)</span>`
            : `<div class="summary-cards-wrap">${p.hand
                .map((c) => {
                  const isPen = penSet.has(c.id);
                  return `<span class="summary-mini-card ${c.isRed ? 'red-card' : 'black-card'} ${
                    isPen ? 'penalty-card' : ''
                  }" title="${isPen ? 'Quân bài bị phạt thối!' : ''}">${c.rank}${c.suit}</span>`;
                })
                .join('')}</div>`;

        const breakdownItems = detailsByPlayer[p.id] || [];
        const detailsHtml = `<div class="penalty-list">${breakdownItems
          .map(
            (item) =>
              `<span class="penalty-chip ${item.isGood ? 'good' : item.isSpecial ? 'bad' : ''}">${item.label}</span>`
          )
          .join('')}</div>`;

        return `
          <tr>
            <td><strong>${isWinner ? '🥇 THẮNG (WIN)' : '💸 Thua'}</strong></td>
            <td><strong>${p.name} ${p.id === this.mySeatId ? '(Bạn)' : ''}</strong></td>
            <td>${cardsHtml}</td>
            <td>${detailsHtml}</td>
            <td class="${deltaClass}">${deltaStr} xu</td>
            <td>🪙 ${p.coins.toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    this.modalSummary.classList.remove('hidden');
  }

  // ============================================================================
  // RENDERING UI (WITH PERSPECTIVE ROTATION & ANIME SKINS/AVATARS)
  // ============================================================================
  createCardElement(card, interactive = false, isPenalty = false, skinId = 'classic') {
    const div = document.createElement('div');
    const isSelected = interactive && this.selectedCardIds.has(card.id);
    const isCompanion = interactive && this.companionCardIds.has(card.id);
    const activeSkin = getCardSkinMeta(skinId);

    div.className = `playing-card ${card.isRed ? 'red-card' : 'black-card'} ${
      card.rankIndex === 12 ? 'is-two' : ''
    } ${isSelected ? 'selected' : ''} ${isCompanion ? 'companion-card' : ''} skin-${activeSkin.id}`;

    if (isPenalty) {
      div.style.border = '2.5px solid #ef4444';
      div.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)';
    }

    const crestHtml = activeSkin.crest
      ? `<span class="card-anime-crest">${activeSkin.crest}</span>`
      : '';
    const bgArtHtml = activeSkin.imgUrl
      ? `<div class="card-anime-art" style="background-image:url('${activeSkin.imgUrl}')"></div>`
      : '';

    div.innerHTML = `
      ${bgArtHtml}
      <div class="card-corner top-left">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${card.suit}</span>
      </div>
      ${crestHtml}
      <div class="card-center-art">${card.suit}</div>
      <div class="card-corner bottom-right">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${card.suit}</span>
      </div>
    `;

    if (interactive) {
      div.addEventListener('click', () => this.toggleCardSelection(card.id));
    }
    return div;
  }

  renderSeats() {
    const rankLabels = { 1: 'WIN 🥇', 2: 'Thua' };

    // Xoay bàn theo góc nhìn của người chơi hiện tại (mySeatId luôn ở vị trí visualSlot = 0 ở dưới cùng)
    for (let visualSlot = 0; visualSlot < 4; visualSlot++) {
      const playerId = (this.mySeatId + visualSlot) % 4;
      const p = this.players[playerId];

      const seatEl = document.getElementById(`seat-${visualSlot}`);
      const nameEl = document.getElementById(`name-${visualSlot}`);
      const avatarEl = document.getElementById(`avatar-${visualSlot}`);
      const coinsEl = document.getElementById(`coins-${visualSlot}`);
      const countEl = document.getElementById(`count-${visualSlot}`);
      const statusEl = document.getElementById(`status-${visualSlot}`);
      const rankEl = document.getElementById(`rank-${visualSlot}`);
      const revealEl = document.getElementById(`reveal-${visualSlot}`);

      if (!p.active && visualSlot !== 0) {
        seatEl.classList.add('hidden');
        continue;
      }
      seatEl.classList.remove('hidden');

      seatEl.classList.toggle('active-turn', !this.isGameOver && this.currentTurn === p.id);
      seatEl.classList.toggle('passed-turn', p.passed);

      if (nameEl) nameEl.textContent = visualSlot === 0 ? `${p.name} (Bạn)` : p.name;
      if (avatarEl) {
        avatarEl.innerHTML = getAvatarHtml(p.avatar || AVATARS[p.id]);
      }
      coinsEl.textContent = p.coins.toLocaleString();
      countEl.textContent = p.hand.length;

      if (p.passed && p.finishRank === null) {
        statusEl.textContent = 'Bỏ lượt';
        statusEl.classList.remove('hidden');
      } else {
        statusEl.classList.add('hidden');
      }

      if (p.finishRank !== null) {
        rankEl.textContent = rankLabels[p.finishRank] || 'Thua';
        rankEl.className = `rank-badge ${p.finishRank === 1 ? 'rank-1' : 'rank-4'}`;
      } else {
        rankEl.className = 'rank-badge hidden';
      }

      // Khi ván bài kết thúc (isGameOver), lật ngửa toàn bộ bài còn lại của các đối thủ ngay trên bàn!
      if (revealEl) {
        if (this.isGameOver && p.hand.length > 0) {
          const penSet = this.penaltyCardIdsByPlayer[p.id] || new Set();
          revealEl.innerHTML = p.hand
            .map((c) => {
              const isPen = penSet.has(c.id);
              return `<div class="mini-open-card ${c.isRed ? 'red-card' : 'black-card'} ${
                isPen ? 'penalty-card' : ''
              }" title="${isPen ? 'Thối bài!' : ''}">
                <span>${c.rank}</span>
                <span>${c.suit}</span>
              </div>`;
            })
            .join('');
          revealEl.classList.remove('hidden');
        } else {
          revealEl.innerHTML = '';
          revealEl.classList.add('hidden');
        }
      }
    }
  }

  renderCenterTrick() {
    this.elPreviousTrick.innerHTML = '';
    if (this.previousCombo) {
      const prevSkin = this.previousCombo.ownerSkin || 'classic';
      this.previousCombo.cards.forEach((c) => {
        this.elPreviousTrick.appendChild(this.createCardElement(c, false, false, prevSkin));
      });
    }

    this.elCurrentTrick.innerHTML = '';
    if (this.currentCombo) {
      const owner = this.players[this.trickOwnerId];
      const curSkin = this.currentCombo.ownerSkin || (owner && owner.cardSkin) || 'classic';
      this.currentCombo.cards.forEach((c) => {
        this.elCurrentTrick.appendChild(this.createCardElement(c, false, false, curSkin));
      });
      this.elTrickOwnerLabel.textContent = `${owner ? owner.name : ''} đánh: ${this.currentCombo.label}`;
    } else {
      this.elCurrentTrick.innerHTML = `<div class="empty-table-watermark">NHẤT ĂN TẤT • ĐẾM LÁ</div>`;
      this.elTrickOwnerLabel.textContent = '';
    }
  }

  renderHumanHand() {
    const human = this.getLocalPlayer();
    const penSet = this.penaltyCardIdsByPlayer[human.id] || new Set();
    const mySkin = human.cardSkin || this.equippedSkin || 'classic';
    this.elHumanHand.innerHTML = '';
    human.hand.forEach((card) => {
      const isPen = this.isGameOver && penSet.has(card.id);
      this.elHumanHand.appendChild(
        this.createCardElement(card, !this.isGameOver, isPen, mySkin)
      );
    });
  }

  renderAll() {
    this.renderSeats();
    this.renderCenterTrick();
    this.renderHumanHand();
    this.updateHumanActionButtons();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tienLenGame = new TienLenGame();
});
