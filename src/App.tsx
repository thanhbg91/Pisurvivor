declare const Pi: any;

import React, { useState, useEffect, useRef } from "react";
import {
  Play, Flame, Shield, Activity, Sparkles, RotateCcw, Heart, Zap,
  Volume2, VolumeX, Trophy, Coins, Skull, Star, HelpCircle, ArrowRight
} from "lucide-react";

// ==========================================
// GAME CONSTANTS & INTERFACES
// ==========================================
interface UpgradeOption {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  level: number;
  type: "weapon" | "stat";
}

interface Weapon {
  id: string;
  name: string;
  level: number;
  timer: number;
  maxTimer: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  color: string;
  type: "drone" | "charger" | "goliath" | "boss";
  points: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  size: number;
  color: string;
  pierce: number;
}

interface Item {
  x: number;
  y: number;
  amount: number;
  size: number;
  color: string;
  isGold: boolean;
  pulling: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface DamageText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

interface HighScore {
  time: string;
  kills: number;
  gold: number;
  level: number;
  date: string;
}
const GOLD_PER_PI = 100;
const SHOP_CONFIG = {
  health: { name: "NANOSHIELD ARMOR", baseCost: 150, maxLevel: 5, step: 150 },
  speed: { name: "REACTOR THRUSTERS", baseCost: 200, maxLevel: 5, step: 200 },
  damage: { name: "PLASMA ACCELERATORS", baseCost: 250, maxLevel: 5, step: 250 },
  magnet: { name: "GRAVITY MAGNET", baseCost: 100, maxLevel: 5, step: 100 },
  regen: { name: "BIOMETRIC REGEN", baseCost: 300, maxLevel: 5, step: 300 }
};



export default function App() {
    // --- CODE ĐĂNG NHẬP PI NETWORK ---
  const authPiNetwork = async () => {
    try {
      const scopes = ['username', 'payments'];
      const authResult = await (window as any).Pi.authenticate(scopes, (payment: any) => {
        console.log("Giao dịch treo:", payment);
      });
      alert(`Chào mừng Pioneer: ${authResult.user.username}`);
      return true;
    } catch (error) {
      console.error("Lỗi xác thực Pi:", error);
      alert("Bạn cần cấp quyền đăng nhập Pi để chơi game!");
      return false;
    }
  };
  // ---------------------------------
  
  // ==========================================
  // REACT STATE (UI, Overlays, Persistent Upgrades)
  // ==========================================
  const [gameState, setGameState] = useState<"START" | "PLAYING" | "GAMEOVER">("START");
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("pioneer_muted");
    return saved ? JSON.parse(saved) : false;
  });

  // Score stats
  const [gameStats, setGameStats] = useState({
    time: "00:00",
    kills: 0,
    gold: 0,
    level: 1,
    xpPercent: 0,
    hpPercent: 100,
  });

  // --- HỆ THỐNG KIỂM TRA ĐĂNG NHẬP PI CHUẨN HOÀN THIỆN ---
  useEffect(() => {
    const checkPiAuth = async () => {
            if ((window as any).Pi && !((window as any).Pi.initialized)) {
        try {
          (window as any).Pi.init({ version: "2.0", sandbox: true });
          (window as any).Pi.initialized = true;
        } catch (e) {
          console.error("Lỗi kích hoạt ví:", e);
        }
            }
      
      if (gameState === "PLAYING") {
        // Kiểm tra xem trước đó phiên làm việc này đã được xác thực chưa
        const isAlreadyAuthed = sessionStorage.getItem("pi_authed");
        if (isAlreadyAuthed === "true") {
          return; // Đã đăng nhập rồi thì cho vào thẳng game, không gọi Pi SDK nữa
        }

        try {
          const scopes = ['username', 'payments'];
          const authResult = await (window as any).Pi.authenticate(scopes, (payment: any) => {
            console.log("Giao dịch treo:", payment);
          });
          
          alert(`Chào mừng Pioneer: ${authResult.user.username}`);
          // Lưu trạng thái đã xác thực thành công vào bộ nhớ tạm của phiên chơi
          sessionStorage.setItem("pi_authed", "true");
          
        } catch (error) {
          console.error("Lỗi đăng nhập Pi:", error);
          alert("Bạn cần cấp quyền đăng nhập tài khoản Pi để có thể trải nghiệm game!");
          setGameState("START"); // Đá về màn hình chờ nếu lỗi hoặc từ chối
        }
      }
    };
    
    checkPiAuth();
  }, [gameState]);
  // ---------------------------------------------------------------------
  const handlePurchaseAndUpgrade = async (key: "damage" | "health" | "speed" | "magnet" | "regen") => {
        // --- KÍCH HOẠT VÍ NGAY KHI ẤN NÚT UPGRADE ---
    if ((window as any).Pi && !((window as any).Pi.initialized)) {
      try {
        (window as any).Pi.init({ version: "2.0", sandbox: true });
        (window as any).Pi.initialized = true;
      } catch (e) {
        console.error("Lỗi kích hoạt ví:", e);
      }
    }
    // --------------------------------------------
    
    const config = SHOP_CONFIG[key];
    const currentLevel = shopUpgrades[key] || 0;

    if (currentLevel >= config.maxLevel) {
      alert("Tính năng này đã đạt cấp tối đa (MAXED)!");
      return;
    }

    const currentCost = config.baseCost + (currentLevel * config.step);

    if (metaGold >= currentCost) {
      const remainingGold = metaGold - currentCost;
      const updatedUpgrades = { ...shopUpgrades, [key]: currentLevel + 1 };
      setMetaGold(remainingGold);
      setShopUpgrades(updatedUpgrades);
      localStorage.setItem("pioneer_meta_gold", remainingGold.toString());
      localStorage.setItem("pioneer_shop_upgrades", JSON.stringify(updatedUpgrades));
      alert(`Nâng cấp thành công ${config.name}!`);
      return;
    }

    const missingGold = currentCost - metaGold;
    const piAmountNeeded = parseFloat((missingGold / GOLD_PER_PI).toFixed(4));

    if (!(window as any).Pi) {
      alert("Vui lòng mở game trong Pi Browser để thanh toán bằng ví Pi!");
      return;
    }

    const confirmPayment = window.confirm(
      `Bạn thiếu ${missingGold} Xu. Bạn có muốn thanh toán ${piAmountNeeded} Pi để hoàn tất nâng cấp không?`
    );
    if (!confirmPayment) return;

    try {
      await (window as any).Pi.createPayment({
        amount: piAmountNeeded,
        memo: `Mua xu nâng cấp ${config.name} trong game Survivor Pi`,
        metadata: { upgrade_key: key, missing_gold: missingGold },
      }, {
        onReadyForServerApproval: (paymentId: string) => {
          console.log("Đang chờ phê duyệt:", paymentId);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          const finalGold = metaGold + missingGold - currentCost;
          const updatedUpgrades = { ...shopUpgrades, [key]: currentLevel + 1 };
          setMetaGold(finalGold);
          setShopUpgrades(updatedUpgrades);
          localStorage.setItem("pioneer_meta_gold", finalGold.toString());
          localStorage.setItem("pioneer_shop_upgrades", JSON.stringify(updatedUpgrades));
          alert(`Thanh toán thành công ${piAmountNeeded} Pi! Đã nâng cấp lên Cấp ${currentLevel + 1}.`);
        },
        onCancel: () => alert("Giao dịch đã bị hủy."),
        onError: (err: any) => alert("Giao dịch thất bại. Vui lòng kiểm tra lại số dư ví Pi!")
      });
    } catch (error) {
      alert("Không thể kết nối đến Ví Pi Network!");
    }
  };
  
  
    // --- HÀM GỌI VÍ PI TESTNET THANH TOÁN VẬT PHẨM ---
  const handlePiPayment = async (amount: number, itemName: string) => {
    try {
      // 1. Tạo dữ liệu đơn hàng
      const paymentData = {
        amount: amount, // Số tiền Pi (Ví dụ: 15 hoặc 25)
        memo: `Mua ${itemName} trong game Survivor pi`, // Ghi chú ví
        metadata: { item_id: itemName.toLowerCase().replace(/\s+/g, '_') },
      };

      // 2. Định nghĩa các hàm callback xử lý vòng đời giao dịch của Pi
      const callbacks = {
        // Trình duyệt Pi Browser gọi khi giao dịch được tạo trên blockchain thành công
        onReadyForServerApproval: (paymentId: string) => {
          console.log("Giao dịch chuẩn bị phê duyệt:", paymentId);
          // Đối với môi trường Sandbox thử nghiệm, chúng ta cho phép duyệt thẳng tự động
          alert("Hệ thống đang phê duyệt đơn hàng...");
        },
        // Trình duyệt gọi khi người chơi đã nhập mật khẩu 24 từ và ký duyệt chuyển Pi
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log("Người chơi đã ký chuyển tiền. TxID:", txid);
          alert(`Thanh toán thành công ${amount} Pi! Bạn đã được nâng cấp.`);
          
          // --- CHÈN LOGIC NÂNG CẤP CHỈ SỐ GAME CỦA BẠN TẠI ĐÂY ---
          // Ví dụ: logicNangCapVatPham(itemName);
        },
        // Gọi khi người dùng chủ động bấm nút hủy bỏ giao dịch/đóng ví
        onCancel: (paymentId: string) => {
          alert("Bạn đã hủy bỏ giao dịch thanh toán ví Pi.");
        },
        // Gọi khi hệ thống blockchain của Pi phát sinh lỗi mạng
        onError: (error: any, payment?: any) => {
          console.error("Lỗi giao dịch ví Pi:", error);
          alert("Giao dịch thất bại. Vui lòng kiểm tra lại số dư ví Pi Testnet!");
        }
      };

      // 3. Kích hoạt gọi ví Pi bật lên màn hình
      await (window as any).Pi.createPayment(paymentData, callbacks);

    } catch (error) {
      console.error("Lỗi khởi tạo ví Pi:", error);
      alert("Không thể kết nối đến Ví Pi Network!");
    }
  };
  // ----------------------------------------------------


  const [finalStats, setFinalStats] = useState({
    time: "00:00",
    kills: 0,
    gold: 0,
    level: 1,
    unlockedGold: 0
  });

  // Persistent Meta-Progression Shop State (Saved in LocalStorage)
  const [metaGold, setMetaGold] = useState(() => {
    const saved = localStorage.getItem("pioneer_meta_gold");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [shopUpgrades, setShopUpgrades] = useState(() => {
    const saved = localStorage.getItem("pioneer_shop_upgrades");
    return saved
      ? JSON.parse(saved)
      : { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0 };
  });

  const [highScores, setHighScores] = useState<HighScore[]>(() => {
    const saved = localStorage.getItem("pioneer_highscores");
    return saved ? JSON.parse(saved) : [];
  });

  // Ad simulation overlays
  const [adState, setAdState] = useState<{
    visible: boolean;
    type: "REROLL" | "REVIVE" | "DOUBLE_GOLD" | null;
    timer: number;
    title: string;
  }>({
    visible: false,
    type: null,
    timer: 0,
    title: "",
  });

  const [hasRevivedThisRun, setHasRevivedThisRun] = useState(false);
  const [doubleGoldApplied, setDoubleGoldApplied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // ==========================================
  // REFS FOR CANVAS & GAME STATE ENGINE
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Engine State Ref to bypass React re-render latency
  const engineRef = useRef({
    player: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      xpNeeded: 50,
      gold: 0,
      kills: 0,
      speed: 1.8,
      magnetRange: 100,
      damageMultiplier: 1.0,
      regenRate: 0, // HP/sec
      size: 14,
    },
    weapons: [] as Weapon[],
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    items: [] as Item[],
    particles: [] as Particle[],
    damageTexts: [] as DamageText[],
    keys: {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    },
    joystick: {
      active: false,
      startX: 0,
      startY: 0,
      curX: 0,
      curY: 0,
    },
    gameTime: 0, // seconds
    spawnTimer: 0,
    isPaused: false,
    bossSpawned: false,
    shieldAngle: 0,
    lastFrameTime: 0,
  });

  // ==========================================
  // PROCEDURAL SOUND MATRIX (Web Audio API)
  // ==========================================
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const playSfx = (type: "shoot" | "hit" | "kill" | "xp" | "levelup" | "hurt" | "revive" | "ad" | "gameover" | "upgrade") => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case "shoot":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        case "hit":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.setValueAtTime(40, now + 0.08);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        case "hurt":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.linearRampToValueAtTime(60, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case "kill":
          osc.type = "square";
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case "xp":
          osc.type = "sine";
          osc.frequency.setValueAtTime(950, now);
          osc.frequency.exponentialRampToValueAtTime(1300, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case "levelup":
          // Cheerful ascending arpeggio
          const notes = [440, 554.37, 659.25, 880];
          notes.forEach((freq, idx) => {
            const toneOsc = ctx.createOscillator();
            const toneGain = ctx.createGain();
            toneOsc.connect(toneGain);
            toneGain.connect(ctx.destination);
            toneOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
            toneGain.gain.setValueAtTime(0.1, now + idx * 0.08);
            toneGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
            toneOsc.start(now + idx * 0.08);
            toneOsc.stop(now + idx * 0.08 + 0.15);
          });
          break;
        case "upgrade":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        case "revive":
          // High synth sweep
          osc.type = "sine";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case "ad":
          // Happy commercial jingle
          [392, 523.25, 659.25, 783.99].forEach((f, idx) => {
            const jOsc = ctx.createOscillator();
            const jGain = ctx.createGain();
            jOsc.connect(jGain);
            jGain.connect(ctx.destination);
            jOsc.frequency.setValueAtTime(f, now + idx * 0.1);
            jGain.gain.setValueAtTime(0.08, now + idx * 0.1);
            jGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
            jOsc.start(now + idx * 0.1);
            jOsc.stop(now + idx * 0.1 + 0.2);
          });
          break;
        case "gameover":
          // Melodramatic minor chord fall
          const baseNotes = [293.66, 349.23, 440]; // D minor
          baseNotes.forEach((f, idx) => {
            const gOsc = ctx.createOscillator();
            const gGain = ctx.createGain();
            gOsc.connect(gGain);
            gGain.connect(ctx.destination);
            gOsc.frequency.setValueAtTime(f, now);
            gOsc.frequency.linearRampToValueAtTime(f * 0.5, now + 0.6);
            gGain.gain.setValueAtTime(0.12, now);
            gGain.gain.exponentialRampToValueAtTime(0.005, now + 0.6);
            gOsc.start(now);
            gOsc.stop(now + 0.6);
          });
          break;
      }
    } catch (e) {
      console.warn("Audio Context Error", e);
    }
  };

  // Toggle Mute Helper
  const toggleMute = () => {
    setIsMuted((prev: boolean) => {
      const next = !prev;
      localStorage.setItem("pioneer_muted", JSON.stringify(next));
      return next;
    });
  };

  // ==========================================
  // INITIAL GAME SETUP & RESIZING
  // ==========================================
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    if (gameState === "PLAYING") {
      handleResize();
      window.addEventListener("resize", handleResize);
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [gameState]);

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(k) || ["arrowup", "arrowleft", "arrowdown", "arrowright"].includes(e.key.toLowerCase())) {
        const keyMap = engineRef.current.keys as any;
        if (k in keyMap) keyMap[k] = true;
        if (e.key in keyMap) keyMap[e.key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const keyMap = engineRef.current.keys as any;
      if (k in keyMap) keyMap[k] = false;
      if (e.key in keyMap) keyMap[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ==========================================
  // GAME START / INITIALIZATION FUNCTION
  // ==========================================
  const startNewGame = () => {
    initAudio();
    setHasRevivedThisRun(false);
    setDoubleGoldApplied(false);

    // Apply permanent stats from shop
    const baseMaxHp = 100 + shopUpgrades.health * 15;
    const baseSpeed = 1.8 + shopUpgrades.speed * 0.18;
    const baseDamage = 1.0 + shopUpgrades.damage * 0.15;
    const baseMagnet = 100 + shopUpgrades.magnet * 25;
    const baseRegen = shopUpgrades.regen * 0.35;

    // Reset Engine Ref
    engineRef.current = {
      player: {
        x: 0,
        y: 0,
        hp: baseMaxHp,
        maxHp: baseMaxHp,
        level: 1,
        xp: 0,
        xpNeeded: 50,
        gold: 0,
        kills: 0,
        speed: baseSpeed,
        magnetRange: baseMagnet,
        damageMultiplier: baseDamage,
        regenRate: baseRegen,
        size: 14,
      },
      weapons: [
        { id: "plasma_gun", name: "Plasma Cannon", level: 1, timer: 0, maxTimer: 60 }
      ],
      enemies: [],
      projectiles: [],
      items: [],
      particles: [],
      damageTexts: [],
      keys: {
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
      },
      joystick: {
        active: false,
        startX: 0,
        startY: 0,
        curX: 0,
        curY: 0,
      },
      gameTime: 0,
      spawnTimer: 0,
      isPaused: false,
      bossSpawned: false,
      shieldAngle: 0,
      lastFrameTime: performance.now(),
    };

    setGameState("PLAYING");
    setIsLevelUp(false);
    setGameStats({
      time: "00:00",
      kills: 0,
      gold: 0,
      level: 1,
      xpPercent: 0,
      hpPercent: 100,
    });
  };

  // ==========================================
  // WEAPON FIRE BEHAVIOR HANDLER
  // ==========================================
  const fireWeapon = (wpn: Weapon, player: any, enemies: Enemy[], projectiles: Projectile[]) => {
    // Targets the nearest enemy
    if (enemies.length === 0) return;

    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;

    enemies.forEach((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (!nearestEnemy) return;

    const target: Enemy = nearestEnemy;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / dist) * 6; // bullet speed
    const vy = (dy / dist) * 6;

    const baseDmg = 12 * player.damageMultiplier;

    if (wpn.id === "plasma_gun") {
      playSfx("shoot");
      if (wpn.level === 1) {
        projectiles.push({ x: player.x, y: player.y, vx, vy, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
      } else if (wpn.level === 2) {
        // Double shots slightly angled
        projectiles.push({ x: player.x, y: player.y, vx: vx * 0.98 - vy * 0.05, vy: vy * 0.98 + vx * 0.05, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
        projectiles.push({ x: player.x, y: player.y, vx: vx * 0.98 + vy * 0.05, vy: vy * 0.98 - vx * 0.05, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
      } else if (wpn.level === 3) {
        // High Damage Heavy shots
        projectiles.push({ x: player.x, y: player.y, vx: vx * 1.2, vy: vy * 1.2, damage: baseDmg * 1.5, size: 6, color: "#facc15", pierce: 1 });
      } else if (wpn.level === 4) {
        // 3 spread shot
        projectiles.push({ x: player.x, y: player.y, vx, vy, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
        projectiles.push({ x: player.x, y: player.y, vx: vx * 0.92 - vy * 0.15, vy: vy * 0.92 + vx * 0.15, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
        projectiles.push({ x: player.x, y: player.y, vx: vx * 0.92 + vy * 0.15, vy: vy * 0.92 - vx * 0.15, damage: baseDmg, size: 4, color: "#38bdf8", pierce: 1 });
      } else {
        // Max Level Hyper Plasma (Pierces)
        projectiles.push({ x: player.x, y: player.y, vx: vx * 1.3, vy: vy * 1.3, damage: baseDmg * 1.8, size: 7, color: "#a855f7", pierce: 3 });
      }
    }

    if (wpn.id === "lightning_rod") {
      // Periodic Lightning targets random enemies
      const strikeCount = wpn.level >= 4 ? 4 : wpn.level >= 2 ? 2 : 1;
      const damage = (30 + wpn.level * 15) * player.damageMultiplier;
      const splash = wpn.level >= 3;

      for (let i = 0; i < strikeCount; i++) {
        if (enemies.length === 0) break;
        const index = Math.floor(Math.random() * enemies.length);
        const tgt = enemies[index];
        playSfx("hit");

        // Flash and strike on canvas coordinates inside the loop
        // Deal damage immediately
        tgt.hp -= damage;
        engineRef.current.damageTexts.push({
          x: tgt.x,
          y: tgt.y - 10,
          text: `${Math.round(damage)}⚡`,
          color: "#e0f2fe",
          alpha: 1,
          vy: -1.5
        });

        // Add splash damage
        if (splash) {
          enemies.forEach((other) => {
            if (other.id !== tgt.id) {
              const dxo = other.x - tgt.x;
              const dyo = other.y - tgt.y;
              const disto = Math.sqrt(dxo * dxo + dyo * dyo);
              if (disto < 75) {
                const splashDmg = damage * 0.5;
                other.hp -= splashDmg;
                engineRef.current.damageTexts.push({
                  x: other.x,
                  y: other.y - 8,
                  text: `${Math.round(splashDmg)}`,
                  color: "#93c5fd",
                  alpha: 1,
                  vy: -1.2
                });
              }
            }
          });
        }

        // Spawn strike sparks
        for (let s = 0; s < 12; s++) {
          engineRef.current.particles.push({
            x: tgt.x,
            y: tgt.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: "#60a5fa",
            size: 2 + Math.random() * 2,
            alpha: 1,
            decay: 0.05 + Math.random() * 0.04
          });
        }
      }
    }

    if (wpn.id === "quantum_wave") {
      // Expand shockwave pulse from center
      const radius = 100 + wpn.level * 25;
      const dmg = (15 + wpn.level * 8) * player.damageMultiplier;
      const knockbackForce = wpn.level >= 3 ? 6 : 4;
      playSfx("shoot");

      enemies.forEach((e) => {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          e.hp -= dmg;
          // Apply push back
          const angle = Math.atan2(dy, dx);
          e.x += Math.cos(angle) * knockbackForce;
          e.y += Math.sin(angle) * knockbackForce;

          engineRef.current.damageTexts.push({
            x: e.x,
            y: e.y - 12,
            text: `${Math.round(dmg)}`,
            color: "#22d3ee",
            alpha: 1,
            vy: -1.0
          });
        }
      });

      // Spawn concentric pulse visual rings
      for (let p = 0; p < 3; p++) {
        setTimeout(() => {
          if (gameState !== "PLAYING" || engineRef.current.isPaused) return;
          // Spawn cosmetic expanding wave particle ring in frame
          for (let r = 0; r < 24; r++) {
            const angle = (r / 24) * Math.PI * 2;
            engineRef.current.particles.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * (radius / 15),
              vy: Math.sin(angle) * (radius / 15),
              color: "rgba(34, 211, 238, 0.4)",
              size: 3,
              alpha: 0.8,
              decay: 0.04
            });
          }
        }, p * 120);
      }
    }
  };

  // ==========================================
  // LEVEL UP UPGRADE RANDOMIZER
  // ==========================================
  const triggerLevelUp = () => {
    engineRef.current.isPaused = true;
    playSfx("levelup");

    // Form upgrade choices
    const options: UpgradeOption[] = [];
    const playerWeapons = engineRef.current.weapons;

    // Helper to get active weapon level
    const getLevel = (id: string) => playerWeapons.find((w) => w.id === id)?.level || 0;

    // Upgrades Pool
    const pool = [
      { id: "plasma_gun", name: "Plasma Cannon", desc: "Autofires high-velocity plasma bolts targeting nearest foes.", icon: <Flame className="w-6 h-6 text-sky-400" />, type: "weapon" as const },
      { id: "nanoshield", name: "Nano-Orbit Shield", desc: "Energy orbs rotate around you, tearing down contacting threats.", icon: <Shield className="w-6 h-6 text-emerald-400" />, type: "weapon" as const },
      { id: "quantum_wave", name: "Quantum Nova", desc: "Fires expanding gravity pulses to damage and knock back swarms.", icon: <Zap className="w-6 h-6 text-cyan-400" />, type: "weapon" as const },
      { id: "lightning_rod", name: "Tesla Strike", desc: "Calls high-voltage electric discharges striking random invaders.", icon: <Sparkles className="w-6 h-6 text-violet-400" />, type: "weapon" as const },
      { id: "stat_dmg", name: "Damage Accelerator", desc: "Supercharges weapon reactors, increasing damage output by +15%.", icon: <Zap className="w-6 h-6 text-amber-400" />, type: "stat" as const },
      { id: "stat_speed", name: "Thruster Overclock", desc: "Improves structural propulsion systems, boosting speed by +12%.", icon: <Activity className="w-6 h-6 text-rose-400" />, type: "stat" as const },
      { id: "stat_magnet", name: "Quantum Harvester", desc: "Overclocks electromagnetic pickup matrix for items by +25%.", icon: <Sparkles className="w-6 h-6 text-fuchsia-400" />, type: "stat" as const },
      { id: "stat_heal", name: "Micro-Repair Bots", desc: "Injects nanite streams that passively regenerate +0.5 HP/sec.", icon: <Heart className="w-6 h-6 text-green-400" />, type: "stat" as const },
    ];

    // Pick 3 random, relevant upgrades
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.filter((item) => {
      if (item.type === "weapon") {
        const lvl = getLevel(item.id);
        return lvl < 5; // Allow unlocking or leveling up up to 5
      }
      return true;
    }).slice(0, 3);

    const formatted: UpgradeOption[] = selected.map((item) => {
      const curLvl = getLevel(item.id);
      return {
        id: item.id,
        name: curLvl > 0 ? `${item.name} (Lv. ${curLvl + 1})` : `Unlock ${item.name}`,
        desc: item.desc,
        icon: item.icon,
        level: curLvl,
        type: item.type,
      };
    });

    setLevelUpOptions(formatted);
    setIsLevelUp(true);
  };

  const applyUpgrade = (opt: UpgradeOption) => {
    const engine = engineRef.current;
    playSfx("upgrade");

    if (opt.type === "weapon") {
      const existing = engine.weapons.find((w) => w.id === opt.id);
      if (existing) {
        existing.level += 1;
      } else {
        // Unlock new weapon
        let maxTimer = 60;
        if (opt.id === "lightning_rod") maxTimer = 150;
        if (opt.id === "quantum_wave") maxTimer = 220;
        if (opt.id === "nanoshield") maxTimer = 999999; // passive updater

        engine.weapons.push({ id: opt.id, name: opt.name, level: 1, timer: 0, maxTimer });
      }
    } else {
      // Stat Upgrades
      if (opt.id === "stat_dmg") engine.player.damageMultiplier += 0.15;
      if (opt.id === "stat_speed") engine.player.speed += 0.18;
      if (opt.id === "stat_magnet") engine.player.magnetRange += 25;
      if (opt.id === "stat_heal") {
        engine.player.regenRate += 0.5;
        engine.player.hp = Math.min(engine.player.hp + 20, engine.player.maxHp);
      }
    }

    // Resume loop
    engine.isPaused = false;
    setIsLevelUp(false);
  };

  // ==========================================
  // AD MONETIZATION INTEGRATIONS (MOCK)
  // ==========================================
  const triggerAdFlow = (
    type: "REROLL" | "REVIVE" | "DOUBLE_GOLD",
    title: string,
    onReward: () => void
  ) => {
    playSfx("ad");
    engineRef.current.isPaused = true;

    setAdState({
      visible: true,
      type,
      timer: 1.5, // 1.5-second high-energy simulated ad
      title,
    });

    const interval = setInterval(() => {
      setAdState((prev) => {
        if (prev.timer <= 0.1) {
          clearInterval(interval);
          setTimeout(() => {
            setAdState({ visible: false, type: null, timer: 0, title: "" });
            onReward();
          }, 300);
          return { ...prev, timer: 0 };
        }
        return { ...prev, timer: prev.timer - 0.1 };
      });
    }, 100);
  };

  const handleRerollAd = () => {
    // showRerollAd() console stub and full game interaction
    console.log("showRerollAd(): Dispatching interactive video ad to reshuffle game cards");
    triggerAdFlow("REROLL", "Reshuffling Skill Cards...", () => {
      const pool = [
        { id: "plasma_gun", name: "Plasma Cannon", desc: "Autofires high-velocity plasma bolts targeting nearest foes.", icon: <Flame className="w-6 h-6 text-sky-400" />, type: "weapon" as const },
        { id: "nanoshield", name: "Nano-Orbit Shield", desc: "Energy orbs rotate around you, tearing down contacting threats.", icon: <Shield className="w-6 h-6 text-emerald-400" />, type: "weapon" as const },
        { id: "quantum_wave", name: "Quantum Nova", desc: "Fires expanding gravity pulses to damage and knock back swarms.", icon: <Zap className="w-6 h-6 text-cyan-400" />, type: "weapon" as const },
        { id: "lightning_rod", name: "Tesla Strike", desc: "Calls high-voltage electric discharges striking random invaders.", icon: <Sparkles className="w-6 h-6 text-violet-400" />, type: "weapon" as const },
        { id: "stat_dmg", name: "Damage Accelerator", desc: "Supercharges weapon reactors, increasing damage output by +15%.", icon: <Zap className="w-6 h-6 text-amber-400" />, type: "stat" as const },
        { id: "stat_speed", name: "Thruster Overclock", desc: "Improves structural propulsion systems, boosting speed by +12%.", icon: <Activity className="w-6 h-6 text-rose-400" />, type: "stat" as const },
        { id: "stat_magnet", name: "Quantum Harvester", desc: "Overclocks electromagnetic pickup matrix for items by +25%.", icon: <Sparkles className="w-6 h-6 text-fuchsia-400" />, type: "stat" as const },
        { id: "stat_heal", name: "Micro-Repair Bots", desc: "Injects nanite streams that passively regenerate +0.5 HP/sec.", icon: <Heart className="w-6 h-6 text-green-400" />, type: "stat" as const },
      ];

      const playerWeapons = engineRef.current.weapons;
      const getLvl = (id: string) => playerWeapons.find((w) => w.id === id)?.level || 0;

      // Pick 3 random, unique, relevant upgrades
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.filter((item) => {
        if (item.type === "weapon") {
          const lvl = getLvl(item.id);
          return lvl < 5; // Allow unlocking or leveling up up to 5
        }
        return true;
      }).slice(0, 3);

      const randomUpgrades: UpgradeOption[] = selected.map((item) => {
        const curLvl = getLvl(item.id);
        return {
          id: item.id,
          name: curLvl > 0 ? `${item.name} (Lv. ${curLvl + 1})` : `Unlock ${item.name}`,
          desc: item.desc,
          icon: item.icon,
          level: curLvl,
          type: item.type,
        };
      });

      setLevelUpOptions(randomUpgrades);
      engineRef.current.isPaused = true;
    });
  };

  const handleReviveAd = () => {
    // showReviveAd() console stub and full game interaction
    console.log("showReviveAd(): Displaying high-impact video ad. Restoring spaceship core to 50% HP!");
    triggerAdFlow("REVIVE", "System Re-Initialization...", () => {
      const engine = engineRef.current;
      setHasRevivedThisRun(true);
      engine.player.hp = Math.floor(engine.player.maxHp * 0.5);

      // Clear adjacent enemies for safety with blast wave
      engine.enemies = [];
      engine.projectiles = [];
      
     // Create a gorgeous massive star particle explosion
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const spd = 5 + Math.random() * 8;
        engine.particles.push({
          x: engine.player.x,
          y: engine.player.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: "#22c55e",
          size: 4 + Math.random() * 3,
          alpha: 1,
          decay: 0.02
        });
      }

      playSfx("revive");
      setGameState("PLAYING");
      engine.isPaused = false;
      engine.lastFrameTime = performance.now();
    });
  };

  const handleDoubleGoldAd = () => {
    // showDoubleGoldAd() console stub and full game interaction
    console.log("showDoubleGoldAd(): Video ad playback success. Doubling extracted gold reserves!");
    triggerAdFlow("DOUBLE_GOLD", "Doubling Gold Loot...", () => {
      setDoubleGoldApplied(true);
      setFinalStats((prev) => {
        const addedGold = prev.gold;
        const doubledGold = prev.gold * 2;
        // Credit the double gold permanently to currency
        setMetaGold((g) => {
          const next = g + addedGold;
          localStorage.setItem("pioneer_meta_gold", next.toString());
          return next;
        });
        return {
          ...prev,
          gold: doubledGold,
          unlockedGold: prev.unlockedGold + addedGold
        };
      });
      playSfx("levelup");
    });
  };

  // ====================================================
// // PERMANENT META UPGRADE SHOP HANDLERS
// ====================================================
const buyShopUpgrade = (key: any) => {
  const standardizedKey = String(key).toLowerCase() as "damage" | "health" | "speed" | "magnet" | "regen";
  handlePurchaseAndUpgrade(standardizedKey);
  playSfx("upgrade");
};


  const resetSaveData = () => {
    if (confirm("Are you sure you want to reset all permanent stats, high scores, and gold?")) {
      localStorage.clear();
      setMetaGold(0);
      setShopUpgrades({ damage: 0, health: 0, speed: 0, magnet: 0, regen: 0 });
      setHighScores([]);
      playSfx("hurt");
    }
  };

  // ==========================================
  // MAIN CORE GAME loop (requestAnimationFrame)
  // ==========================================
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    let animId: number;

    const gameLoop = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const engine = engineRef.current;

      if (!canvas || !ctx) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Delta Time calculation
      let dt = (time - engine.lastFrameTime) / 16.666; // Normalized around 60fps
      if (dt > 4) dt = 4; // Caps freeze gaps to prevent skips
      engine.lastFrameTime = time;

      if (engine.isPaused) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. UPDATE TIMER & STATS
      engine.gameTime += (16.666 * dt) / 1000;
      const minutes = Math.floor(engine.gameTime / 60);
      const seconds = Math.floor(engine.gameTime % 60);
      const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      // 2. PASSIVE PLAYER STATS (REGEN)
      if (engine.player.regenRate > 0 && engine.player.hp < engine.player.maxHp) {
        const addedHp = (engine.player.regenRate * 16.666 * dt) / 1000;
        engine.player.hp = Math.min(engine.player.hp + addedHp, engine.player.maxHp);
      }

      // 3. PLAYER MOVEMENT INPUTS
      let dx = 0;
      let dy = 0;

      // Handle keyboard move velocity
      if (engine.keys.w || engine.keys.ArrowUp) dy -= 1;
      if (engine.keys.s || engine.keys.ArrowDown) dy += 1;
      if (engine.keys.a || engine.keys.ArrowLeft) dx -= 1;
      if (engine.keys.d || engine.keys.ArrowRight) dx += 1;

      // Handle virtual touch joystick velocity
      if (engine.joystick.active) {
        const jdx = engine.joystick.curX - engine.joystick.startX;
        const jdy = engine.joystick.curY - engine.joystick.startY;
        const jdist = Math.sqrt(jdx * jdx + jdy * jdy);
        if (jdist > 0) {
          const power = Math.min(jdist, 60) / 60;
          dx = (jdx / jdist) * power;
          dy = (jdy / jdist) * power;
        }
      }

      // Normalise direction
      const moveDist = Math.sqrt(dx * dx + dy * dy);
      if (moveDist > 0) {
        engine.player.x += (dx / (moveDist > 1 ? moveDist : 1)) * engine.player.speed * dt;
        engine.player.y += (dy / (moveDist > 1 ? moveDist : 1)) * engine.player.speed * dt;

        // Emit subtle jetpack exhaust particles
        if (Math.random() < 0.3 * dt) {
          engine.particles.push({
            x: engine.player.x - (dx / moveDist) * 10,
            y: engine.player.y - (dy / moveDist) * 10,
            vx: -(dx / moveDist) * 2 + (Math.random() - 0.5),
            vy: -(dy / moveDist) * 2 + (Math.random() - 0.5),
            color: Math.random() > 0.4 ? "#f97316" : "#ef4444",
            size: 2 + Math.random() * 2,
            alpha: 1,
            decay: 0.04
          });
        }
      }

      // Update passive Shield orbit angle
      engine.shieldAngle += 0.05 * dt;

      // 4. WEAPONS UPDATE
      engine.weapons.forEach((wpn) => {
        if (wpn.id === "nanoshield") return; // Render-only or calculated on ticks
        wpn.timer += dt;
        if (wpn.timer >= wpn.maxTimer) {
          wpn.timer = 0;
          fireWeapon(wpn, engine.player, engine.enemies, engine.projectiles);
        }
      });

      // 5. SPAWN SWARMS GRADUALLY IN CIRCLES
      engine.spawnTimer += dt;
      let spawnRate = Math.max(25, 80 - Math.floor(engine.gameTime * 0.4)); // gets faster and harder
      if (engine.spawnTimer >= spawnRate) {
        engine.spawnTimer = 0;

        // Decide type based on elapsed seconds
        let enemyType: Enemy["type"] = "drone";
        let hp = 15;
        let speed = 1.1;
        let size = 9;
        let color = "#ef4444"; // red drone
        let pts = 1;

        const roll = Math.random();
        if (engine.gameTime > 120 && roll < 0.15) {
          enemyType = "goliath";
          hp = 110;
          speed = 0.5;
          size = 18;
          color = "#3b82f6"; // blue giant tank
          pts = 5;
        } else if (engine.gameTime > 50 && roll < 0.25) {
          enemyType = "charger";
          hp = 8;
          speed = 2.1;
          size = 7;
          color = "#22c55e"; // bright green fast
          pts = 2;
        }

        // Periodic minutes bosses
        if (Math.floor(engine.gameTime) > 0 && Math.floor(engine.gameTime) % 60 === 0 && !engine.bossSpawned) {
          enemyType = "boss";
          hp = 450 + Math.floor(engine.gameTime) * 3;
          speed = 0.7;
          size = 28;
          color = "#d946ef"; // purple mega boss
          pts = 20;
          engine.bossSpawned = true;
          engine.damageTexts.push({
            x: engine.player.x,
            y: engine.player.y - 30,
            text: "WARNING: ELITE CARRIER DETECTED!",
            color: "#f43f5e",
            alpha: 1,
            vy: -0.5
          });
        }

        if (Math.floor(engine.gameTime) % 60 !== 0) {
          engine.bossSpawned = false; // reset spawn toggle
        }

        // Spawn 350-450px out in random direction
        const spawnAngle = Math.random() * Math.PI * 2;
        const dist = 380 + Math.random() * 50;
        const enemyX = engine.player.x + Math.cos(spawnAngle) * dist;
        const enemyY = engine.player.y + Math.sin(spawnAngle) * dist;

        engine.enemies.push({
          id: Math.random().toString(),
          x: enemyX,
          y: enemyY,
          hp,
          maxHp: hp,
          speed,
          size,
          color,
          type: enemyType,
          points: pts,
        });
      }

      // 6. UPDATE ENEMIES (MOVE TOWARDS PLAYER)
      engine.enemies.forEach((enemy) => {
        const edx = engine.player.x - enemy.x;
        const edy = engine.player.y - enemy.y;
        const edist = Math.sqrt(edx * edx + edy * edy);
        if (edist > 0) {
          enemy.x += (edx / edist) * enemy.speed * dt;
          enemy.y += (edy / edist) * enemy.speed * dt;
        }

        // Player Collision Damage Check
        if (edist < engine.player.size + enemy.size) {
          const dmg = (enemy.type === "boss" ? 0.8 : enemy.type === "goliath" ? 0.4 : 0.15) * dt;
          // Apply armor reduction from meta shop
          const armorReduction = shopUpgrades.regen * 0.05; // Use regen levels as minor armor reduction too
          const finalHit = Math.max(0.05, dmg * (1 - armorReduction));
          engine.player.hp -= finalHit;

          if (Math.random() < 0.05) {
            playSfx("hurt");
            engine.damageTexts.push({
              x: engine.player.x + (Math.random() - 0.5) * 15,
              y: engine.player.y - 12,
              text: `-${Math.round(finalHit * 10) / 10}`,
              color: "#f87171",
              alpha: 1,
              vy: -0.8
            });
          }
        }
      });

      // 7. ORBITING SHIELD WEAPON PASSIVE DAMAGE COLLISION
      const shieldWpn = engine.weapons.find((w) => w.id === "nanoshield");
      if (shieldWpn) {
        const orbCount = shieldWpn.level >= 5 ? 4 : shieldWpn.level >= 4 ? 3 : shieldWpn.level >= 2 ? 2 : 1;
        const orbitRadius = shieldWpn.level >= 4 ? 75 : 60;
        const shieldDmg = (8 + shieldWpn.level * 4) * engine.player.damageMultiplier;

        for (let i = 0; i < orbCount; i++) {
          const angle = engine.shieldAngle + (i / orbCount) * Math.PI * 2;
          const sx = engine.player.x + Math.cos(angle) * orbitRadius;
          const sy = engine.player.y + Math.sin(angle) * orbitRadius;

          engine.enemies.forEach((e) => {
            const sedx = e.x - sx;
            const sedy = e.y - sy;
            const sedist = Math.sqrt(sedx * sedx + sedy * sedy);
            if (sedist < e.size + 8) {
              e.hp -= shieldDmg * 0.1 * dt; // deals ticking damage over frame delta
              if (Math.random() < 0.06 * dt) {
                playSfx("hit");
                engine.damageTexts.push({
                  x: e.x,
                  y: e.y - 10,
                  text: `${Math.round(shieldDmg)}`,
                  color: "#10b981",
                  alpha: 1,
                  vy: -1.2
                });
                // Small green dust particles on slice hit
                engine.particles.push({
                  x: e.x,
                  y: e.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  color: "#10b981",
                  size: 2,
                  alpha: 1,
                  decay: 0.06
                });
              }
            }
          });
        }
      }

      // 8. UPDATE PROJECTILES & BULLET COLLISION
      for (let i = engine.projectiles.length - 1; i >= 0; i--) {
        const p = engine.projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Check distance limit off screen
        const pdx = p.x - engine.player.x;
        const pdy = p.y - engine.player.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) > 500) {
          engine.projectiles.splice(i, 1);
          continue;
        }

        // Enemy Hits
        for (let j = engine.enemies.length - 1; j >= 0; j--) {
          const e = engine.enemies[j];
          const cdx = e.x - p.x;
          const cdy = e.y - p.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

          if (cdist < e.size + p.size) {
            e.hp -= p.damage;
            playSfx("hit");

            engine.damageTexts.push({
              x: e.x,
              y: e.y - 10,
              text: `${Math.round(p.damage)}`,
              color: "#38bdf8",
              alpha: 1,
              vy: -1.3
            });

            // Spark splash
            for (let s = 0; s < 4; s++) {
              engine.particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 4 + p.vx * 0.1,
                vy: (Math.random() - 0.5) * 4 + p.vy * 0.1,
                color: p.color,
                size: 2,
                alpha: 1,
                decay: 0.07
              });
            }

            p.pierce -= 1;
            if (p.pierce <= 0) {
              engine.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }

      // 9. CLEAN DEFEATED ENEMIES & DROP XP/GOLD
      for (let i = engine.enemies.length - 1; i >= 0; i--) {
        const e = engine.enemies[i];
        if (e.hp <= 0) {
          playSfx("kill");
          engine.player.kills += 1;

          // Splatter particles
          for (let sp = 0; sp < 8; sp++) {
            engine.particles.push({
              x: e.x,
              y: e.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              color: e.color,
              size: 2 + Math.random() * 3,
              alpha: 1,
              decay: 0.05
            });
          }

          // Randomize dropping Gold Coins or XP Orbs
          const isBoss = e.type === "boss";
          const isGold = isBoss ? true : Math.random() < 0.18; // 18% gold chance from normal targets

          engine.items.push({
            x: e.x,
            y: e.y,
            amount: isBoss ? 15 : e.points,
            size: isGold ? 4 : 3,
            color: isGold ? "#fbbf24" : isBoss ? "#d946ef" : "#10b981", // gold, magenta for boss, green for standard xp
            isGold,
            pulling: false,
          });

          engine.enemies.splice(i, 1);
        }
      }

      // 10. MAGNETIC PICKUPS MATRIX
      for (let i = engine.items.length - 1; i >= 0; i--) {
        const item = engine.items[i];
        const idx = engine.player.x - item.x;
        const idy = engine.player.y - item.y;
        const idist = Math.sqrt(idx * idx + idy * idy);

        if (idist < engine.player.magnetRange) {
          item.pulling = true;
        }

        if (item.pulling) {
          // Speed up towards player
          item.x += (idx / idist) * 5 * dt;
          item.y += (idy / idist) * 5 * dt;
        }

        // Actual Collection
        if (idist < engine.player.size + item.size + 4) {
          playSfx("xp");
          if (item.isGold) {
            engine.player.gold += item.amount;
            engine.damageTexts.push({
              x: item.x,
              y: item.y,
              text: `+${item.amount}¢`,
              color: "#fbbf24",
              alpha: 1,
              vy: -1.2
            });
          } else {
            engine.player.xp += item.amount;
          }

          // Check level up!
          if (engine.player.xp >= engine.player.xpNeeded) {
            engine.player.xp -= engine.player.xpNeeded;
            engine.player.level += 1;
            engine.player.xpNeeded = Math.floor(50 + engine.player.level * 40);
            triggerLevelUp();
          }

          engine.items.splice(i, 1);
        }
      }

      // 11. PARTICLES & DAMAGE TEXTS ANIMATION UPDATES
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= pt.decay * dt;
        if (pt.alpha <= 0) {
          engine.particles.splice(i, 1);
        }
      }

      for (let i = engine.damageTexts.length - 1; i >= 0; i--) {
        const txt = engine.damageTexts[i];
        txt.y += txt.vy * dt;
        txt.alpha -= 0.03 * dt;
        if (txt.alpha <= 0) {
          engine.damageTexts.splice(i, 1);
        }
      }

      // 12. TRIGGER DEFEAT/GAME OVER
      if (engine.player.hp <= 0) {
        setGameState("GAMEOVER");
        playSfx("gameover");

        const earnedGold = engine.player.gold;
        // Credit meta gold permanently
        setMetaGold((g) => {
          const next = g + earnedGold;
          localStorage.setItem("pioneer_meta_gold", next.toString());
          return next;
        });

        // Save High Scores
        const finalTime = timeStr;
        const finalKills = engine.player.kills;
        const finalLevel = engine.player.level;
          
