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
