import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Label } from 'recharts';
import { SimulationParams, SimulationDataPoint, BatchResult } from '../types';
import { Calculator, BookOpen, ChevronDown, ChevronUp, Play, FlaskConical, BarChart2, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

// --- MATH UTILITIES ---

const factorial = (() => {
  const cache: number[] = [1, 1];
  return (n: number): number => {
    if (n < 0) return 1;
    if (cache[n]) return cache[n];
    for (let i = cache.length; i <= n; i++) {
      cache[i] = i * cache[i - 1];
    }
    return cache[n];
  };
})();

const poissonPMF = (k: number, lambda: number): number => {
  if (k < 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

// Eigen System Solver for Doob-h transform
const solveEigenSystem = (size: number, beta0: number, beta1: number, theta: number) => {
  let v = new Float64Array(size).fill(1.0);
  let rho = 0;
  const maxIter = 100;
  const tol = 1e-7;

  for (let iter = 0; iter < maxIter; iter++) {
    const w = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      const lambda_i = beta0 + beta1 * i;
      let rowSum = 0;
      const exp_neg_lambda = Math.exp(-lambda_i);
      // We only sum up to size-1, implying truncation approximation
      for (let j = 0; j < size; j++) {
        const p_ij = (Math.pow(lambda_i, j) * exp_neg_lambda) / factorial(j);
        const k_ij = p_ij * Math.exp(theta * j);
        rowSum += k_ij * v[j];
      }
      w[i] = rowSum;
    }
    let norm = 0;
    for(let k=0; k<size; k++) norm += w[k] * w[k];
    norm = Math.sqrt(norm);
    const newRho = norm;
    for(let k=0; k<size; k++) v[k] = w[k] / norm;

    if (Math.abs(newRho - rho) < tol) {
      rho = newRho;
      break;
    }
    rho = newRho;
  }
  return { rho, h: v };
};

const calculateLambda = (theta: number, size: number, beta0: number, beta1: number): number => {
  const { rho } = solveEigenSystem(size, beta0, beta1, theta);
  return Math.log(rho);
};

const calculateDerivative = (theta: number, size: number, beta0: number, beta1: number): number => {
  const h = 0.001;
  const valPlus = calculateLambda(theta + h, size, beta0, beta1);
  const valMinus = calculateLambda(theta - h, size, beta0, beta1);
  return (valPlus - valMinus) / (2 * h);
};

// --- COMPONENTS ---

const EducationPanel = () => {
  const [activeTab, setActiveTab] = useState<'intro' | 'mean' | 'algo'>('intro');
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-800 font-bold border-b border-slate-100"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" />
          理论与操作指南 (Theory & Guide)
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      
      {isOpen && (
        <div className="flex flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-slate-50 border-r border-slate-100 flex md:flex-col overflow-x-auto">
             <button 
               onClick={() => setActiveTab('intro')}
               className={`p-3 text-sm font-medium text-left transition-colors whitespace-nowrap ${activeTab === 'intro' ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
             >
               1. 稀有事件定义
             </button>
             <button 
               onClick={() => setActiveTab('mean')}
               className={`p-3 text-sm font-medium text-left transition-colors whitespace-nowrap ${activeTab === 'mean' ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
             >
               2. 样本均值 LDP
             </button>
             <button 
               onClick={() => setActiveTab('algo')}
               className={`p-3 text-sm font-medium text-left transition-colors whitespace-nowrap ${activeTab === 'algo' ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
             >
               3. 批量仿真逻辑
             </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 text-sm text-slate-700 leading-relaxed min-h-[200px]">
            {activeTab === 'intro' && (
              <div className="animate-fade-in space-y-3">
                <h3 className="font-bold text-lg text-slate-900">稀有事件定义：样本均值大偏差</h3>
                <p>在本次实验中，我们关注的稀有事件不再是单点的 $X_t > a$，而是整个时间段内的<strong>平均行为</strong>是否异常。</p>
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-center font-mono text-yellow-800 my-2">
                   Event A = &#123; S_n / n &gt; a &#125;, where S_n = &sum; X_t
                </div>
                <p>这种类型的稀有事件对应于大偏差理论（LDP）中的 Level-1 大偏差。在保险精算中，这可以对应于“平均索赔额”超过阈值，或者在排队论中对应于“平均负载”过高。</p>
              </div>
            )}

            {activeTab === 'mean' && (
              <div className="animate-fade-in space-y-3">
                <h3 className="font-bold text-lg text-slate-900">为什么只运行一次不够？</h3>
                <p>
                  <strong>单次路径 (Single Path)</strong> 只是随机过程的一种可能实现。要计算概率 $P(S_n/n > a)$，我们必须从统计学角度出发：
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><strong>大数定律：</strong> 我们需要运行 $M$ 次独立的实验（例如 M=2000）。</li>
                  <li><strong>频率估计：</strong> 统计这 $M$ 次中有多少次均值超过了 $a$。</li>
                  <li><strong>IS 估计器：</strong> 在重要性采样中，我们不是简单计数，而是对发生的事件进行<strong>加权</strong>：
                    <br/> 
                    <span className="font-mono bg-slate-100 p-1 rounded inline-block mt-1">
                      {"Wait_Estimate = (1/M) * Sum( I(Sn/n > a) * Ln )"}
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'algo' && (
              <div className="animate-fade-in space-y-3">
                <h3 className="font-bold text-lg text-slate-900">Doob-h 变换与累积似然比</h3>
                <p>为了让 $S_n/n$ 容易超过 $a$，我们利用 Doob-h 变换构造新的概率测度 $Q$，使得在这个测度下，过程的稳态均值直接平移到 $a$ 附近。</p>
                <p>在仿真中，我们需要维护<strong>累积似然比 (Cumulative Likelihood Ratio)</strong>：</p>
                <div className="p-2 bg-slate-100 font-mono text-xs rounded border border-slate-200 overflow-x-auto">
                   {"L_n = L_{n-1} * (P(X_t|X_{t-1}) / Q(X_t|X_{t-1}))"}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  注意：当 n 很大时，L_n 可能会非常小（数值下溢）。但在本演示中步骤较少 (n=100)，直接相乘通常可行。严谨做法是使用对数似然比。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AnalysisPanel: React.FC<{ 
  naiveRes: BatchResult | null; 
  isRes: BatchResult | null; 
  theta: number | null;
  threshold: number;
}> = ({ naiveRes, isRes, theta, threshold }) => {
  if (!isRes || !naiveRes) return null;

  const vrf = isRes.variance > 0 ? naiveRes.variance / isRes.variance : 0;
  const isRare = naiveRes.estimatedProb < 0.05;
  const isCommon = naiveRes.estimatedProb > 0.2;
  
  let analysisTitle = "";
  let analysisColor = "";
  let feedback = "";

  if (vrf > 10) {
    analysisTitle = "效率极佳 (Excellent)";
    analysisColor = "bg-green-50 border-green-200 text-green-800";
    feedback = "VRF 很高，说明这是一个典型的稀有事件。IS 算法成功构造了有效的扭曲测度，相比朴素蒙特卡洛，它在相同的计算量下提供了精度极高的估计。这是 LDP 指导下 IS 的完美应用场景。";
  } else if (vrf > 1.5) {
    analysisTitle = "效率良好 (Good)";
    analysisColor = "bg-blue-50 border-blue-200 text-blue-800";
    feedback = "VRF 适中。事件属于“中等稀有”程度。IS 仍然比朴素方法好，但优势没有极端稀有事件那么夸张。";
  } else if (vrf > 0.8) {
    analysisTitle = "效率一般/退化 (Degenerate)";
    analysisColor = "bg-amber-50 border-amber-200 text-amber-800";
    feedback = `VRF 接近 1。这说明阈值 a=${threshold.toFixed(1)} 实际上并不“稀有”（P ≈ ${(naiveRes.estimatedProb * 100).toFixed(1)}%）。此时最优扭曲参数 θ (${theta?.toFixed(3)}) 接近 0，IS 算法在数学上退化为朴素蒙特卡洛。这是正常的理论预期：当事件常见时，IS 不会带来额外的方差缩减，反而增加了计算似然比的开销。`;
  } else {
    analysisTitle = "效率降低 (Inefficient)";
    analysisColor = "bg-red-50 border-red-200 text-red-800";
    feedback = "VRF < 1，说明方差反而增加了。这通常发生在“过度扭曲”或参数设置不当时。但在本系统中使用了最优 θ，这种情况极少发生，可能是样本量过小导致的随机波动。";
  }

  return (
    <div className={`p-4 rounded-xl border ${analysisColor} mt-6 shadow-sm animate-fade-in`}>
      <h3 className="flex items-center gap-2 font-bold text-lg mb-2">
        <TrendingUp size={20} />
        实验结论分析
      </h3>
      <div className="text-sm leading-relaxed space-y-2">
         <p><strong>1. 方差缩减比 (VRF):</strong> <span className="font-mono font-bold text-lg mx-1">{vrf.toFixed(2)}x</span></p>
         <p>{feedback}</p>
         {isCommon && (
           <div className="flex items-start gap-2 mt-3 p-2 bg-white/50 rounded border border-amber-100">
              <AlertTriangle size={16} className="mt-0.5 text-amber-600 shrink-0"/>
              <span className="text-xs text-amber-700">
                <strong>学术提示：</strong> 
                当原事件为常见事件时（如 a 接近均值），IS 并没有“失效”，而是因为最优测度 Q 逼近原测度 P，所以效果等同于 Naive MC。此时强行使用较大的 θ 会导致方差爆炸。
              </span>
           </div>
         )}
         {!isCommon && (
           <div className="flex items-start gap-2 mt-3 p-2 bg-white/50 rounded border border-green-100">
              <CheckCircle2 size={16} className="mt-0.5 text-green-600 shrink-0"/>
              <span className="text-xs text-green-700">
                <strong>学术提示：</strong> 
                对于稀有事件，Naive MC 很难捕捉到样本（命中数为0或个位数），导致方差极大或估计失效。而 IS 通过“大概率生成稀有样本”+“小权重修正”，完美解决了这个问题。
              </span>
           </div>
         )}
      </div>
    </div>
  );
};

export const SimulationView: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    beta0: 2,
    beta1: 0.5,
    steps: 100,
    initialValue: 1,
    threshold: 6, // Adjusted reasonable threshold for mean
    numTrials: 2000
  });
  
  const [truncationN, setTruncationN] = useState(50);
  const [optimalTheta, setOptimalTheta] = useState<number | null>(null);
  const [eigenInfo, setEigenInfo] = useState<{rho: number, h: Float64Array} | null>(null);
  
  const [computing, setComputing] = useState(false);
  const [solutionLog, setSolutionLog] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Visualization Data (Single Path)
  const [naivePath, setNaivePath] = useState<SimulationDataPoint[]>([]);
  const [isPath, setIsPath] = useState<SimulationDataPoint[]>([]);
  
  // Batch Results
  const [naiveBatchRes, setNaiveBatchRes] = useState<BatchResult | null>(null);
  const [isBatchRes, setIsBatchRes] = useState<BatchResult | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  // --- 1. SOLVER ---
  const solveParameters = async () => {
    setComputing(true);
    setSolutionLog([]);
    setErrorMsg(null);
    setOptimalTheta(null);
    setEigenInfo(null);
    
    // Reset data
    setNaivePath([]);
    setIsPath([]);
    setNaiveBatchRes(null);
    setIsBatchRes(null);
    
    setTimeout(() => {
      try {
        const logs: string[] = [];
        logs.push(`>>> 开始数值求解`);
        logs.push(`参数: β0=${params.beta0}, β1=${params.beta1}`);
        logs.push(`目标: 寻找 θ，使得稳态均值 E_Q[X] ≈ a = ${params.threshold.toFixed(2)}`);
        
        // Bisection for g(theta) = Lambda'(theta) - a = 0
        const targetA = params.threshold;
        const g = (theta: number) => {
          const deriv = calculateDerivative(theta, truncationN, params.beta0, params.beta1);
          return deriv - targetA;
        };

        let low = 0, high = 2.0; 
        const gLow = g(low);
        
        // Check feasibility roughly
        if (gLow > 0) logs.push("提示：当前参数下，自然均值已大于阈值，无需IS，但仍可运行。");
        
        // Extend search range
        if (g(high) < 0) { high = 5.0; logs.push("提示：扩大搜索范围至 theta=5.0"); }

        let root = low;
        let found = false;
        for (let i = 0; i < 50; i++) {
          const mid = (low + high) / 2;
          const val = g(mid);
          if (Math.abs(val) < 1e-5) { root = mid; found = true; break; }
          val < 0 ? low = mid : high = mid;
        }
        
        if (!found && Math.abs(g(root)) > 0.1) {
           throw new Error(`无法找到根。g(low)=${g(0).toFixed(2)}, g(high)=${g(high).toFixed(2)}. 尝试增加截断 N 或检查阈值是否过大。`);
        }

        logs.push(`√ 最优扭曲参数 θ* = ${root.toFixed(6)}`);
        
        // Solve Eigen System
        logs.push(`正在计算特征对 (ρ, h) ...`);
        const system = solveEigenSystem(truncationN, params.beta0, params.beta1, root);
        logs.push(`√ 谱半径 ρ = ${system.rho.toFixed(6)}`);
        
        setSolutionLog(logs);
        setOptimalTheta(root);
        setEigenInfo(system);
        
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "求解器错误");
      } finally {
        setComputing(false);
      }
    }, 100);
  };

  // --- 2. SINGLE PATH GENERATORS (Visuals) ---
  
  const generateSingleNaive = () => {
    const newData: SimulationDataPoint[] = [];
    let currentX = params.initialValue;
    let runningSum = 0;
    
    for (let t = 0; t < params.steps; t++) {
      const lambda = params.beta0 + params.beta1 * currentX;
      // Standard Poisson
      const L_val = Math.exp(-lambda);
      let k = 0;
      let prob = 1;
      do { k++; prob *= Math.random(); } while (prob > L_val);
      const nextX = k - 1;

      runningSum += nextX;
      const runningMean = runningSum / (t + 1);

      newData.push({
        t: t + 1, 
        Xt: nextX, 
        lambda, 
        runningMean
      });
      currentX = nextX;
    }
    setNaivePath(newData);
  };

  const generateSingleIS = () => {
    if (!optimalTheta || !eigenInfo) return;
    const { rho, h } = eigenInfo;
    const theta = optimalTheta;
    const newData: SimulationDataPoint[] = [];
    let currentX = params.initialValue;
    let runningSum = 0;

    for (let t = 0; t < params.steps; t++) {
      const lambda = params.beta0 + params.beta1 * currentX;
      
      // Construct Q
      const q_probs = new Float64Array(truncationN);
      let q_sum = 0;
      for(let y = 0; y < truncationN; y++) {
        const p_yx = poissonPMF(y, lambda);
        const h_val_y = h[y] || 0;
        const h_val_x = h[currentX] || h[truncationN - 1];
        q_probs[y] = (p_yx * Math.exp(theta * y) * h_val_y) / (rho * h_val_x);
        q_sum += q_probs[y];
      }
      for(let y=0; y<truncationN; y++) q_probs[y] /= q_sum; // normalize

      // Sample from Q
      const U = Math.random();
      let nextX = 0;
      let cdf = 0;
      for(let k=0; k<truncationN; k++) {
        cdf += q_probs[k];
        if (cdf >= U) { nextX = k; break; }
      }
      
      runningSum += nextX;
      const runningMean = runningSum / (t + 1);

      newData.push({
        t: t + 1, 
        Xt: nextX, 
        lambda, 
        runningMean
      });
      currentX = nextX;
    }
    setIsPath(newData);
  };

  // --- 3. BATCH MONTE CARLO EXPERIMENT ---
  const runBatchExperiment = async () => {
    if (!optimalTheta || !eigenInfo) return;
    setBatchRunning(true);
    setNaiveBatchRes(null);
    setIsBatchRes(null);

    // Using setTimeout to allow UI to render "running" state
    setTimeout(() => {
      const { rho, h } = eigenInfo;
      const theta = optimalTheta;
      const M = params.numTrials;
      const N = params.steps;
      const a = params.threshold;

      // --- A. NAIVE BATCH ---
      let naiveHits = 0;
      
      for(let i=0; i<M; i++) {
        let currentX = params.initialValue;
        let sumX = 0;
        for(let t=0; t<N; t++) {
           const lambda = params.beta0 + params.beta1 * currentX;
           // Fast Poisson Generator (Knuth)
           const L_val = Math.exp(-lambda);
           let k = 0;
           let prob = 1;
           do { k++; prob *= Math.random(); } while (prob > L_val);
           const nextX = k - 1;
           
           sumX += nextX;
           currentX = nextX;
        }
        if (sumX / N > a) naiveHits++;
      }
      
      const naiveProb = naiveHits / M;
      const naiveVar = (naiveProb * (1 - naiveProb)) / M; // Variance of estimator
      const naiveCI: [number, number] = [
        Math.max(0, naiveProb - 1.96 * Math.sqrt(naiveVar)), 
        naiveProb + 1.96 * Math.sqrt(naiveVar)
      ];

      setNaiveBatchRes({
        estimatedProb: naiveProb,
        variance: naiveVar,
        confidenceInterval: naiveCI,
        totalHits: naiveHits
      });

      // --- B. IS BATCH ---
      let wSum = 0;
      let wSqSum = 0;
      let isHits = 0; // Just to see how many samples qualified under Q (should be many)

      for(let i=0; i<M; i++) {
        let currentX = params.initialValue;
        let sumX = 0;
        let logLikelihoodRatio = 0;

        for(let t=0; t<N; t++) {
           const lambda = params.beta0 + params.beta1 * currentX;
           
           // Prepare Q
           // Optimization: Precomputing Q CDF for currentX is expensive inside loop.
           // For complexity reasons in JS, we do it inline but optimized.
           // NOTE: In real high-perf code, we'd precompute tables or use rejection sampling for Q.
           const h_val_x = h[currentX] || h[truncationN - 1];
           
           // We need to sample nextX from Q. 
           // Since Q is tilted Poisson, it's roughly Poisson(lambda * e^theta). 
           // Let's use Inverse Transform for correctness.
           
           // 1. Build CDF of Q (limited to truncationN)
           const q_probs = new Float64Array(truncationN);
           let q_norm = 0;
           for(let y=0; y<truncationN; y++) {
             // Q(y) ~ P(y) * e^(theta*y) * h(y)
             const prob = (Math.pow(lambda, y) * Math.exp(-lambda)) / factorial(y);
             const h_y = h[y] || 0;
             q_probs[y] = (prob * Math.exp(theta * y) * h_y); 
             q_norm += q_probs[y];
           }
           
           // Sample U
           const U = Math.random() * q_norm;
           let nextX = 0;
           let cdf = 0;
           for(let k=0; k<truncationN; k++) {
             cdf += q_probs[k];
             if (cdf >= U) { nextX = k; break; }
           }
           
           // Update Likelihood Ratio L = P / Q
           // L = (P * rho * h_x) / (P * e^(theta*y) * h_y) = rho * h_x * e^(-theta*y) / h_y
           // Log L = log(rho) + log(h_x) - theta*y - log(h_y)
           const h_val_next = h[nextX] || 1e-10;
           const stepLogL = Math.log(rho) + Math.log(h_val_x) - (theta * nextX) - Math.log(h_val_next);
           
           logLikelihoodRatio += stepLogL;
           
           sumX += nextX;
           currentX = nextX;
        }

        const likelihood = Math.exp(logLikelihoodRatio);
        
        // Indicator function
        if (sumX / N > a) {
           isHits++;
           wSum += likelihood;
           wSqSum += (likelihood * likelihood);
        }
      }
      
      const importanceProb = wSum / M;
      const isVarSample = (wSqSum / M) - (importanceProb * importanceProb); // Variance of the variable X = I * L
      const isVarEstimator = isVarSample / M; // Variance of the Mean Estimator
      const isCI: [number, number] = [
        Math.max(0, importanceProb - 1.96 * Math.sqrt(isVarEstimator)),
        importanceProb + 1.96 * Math.sqrt(isVarEstimator)
      ];

      setIsBatchRes({
        estimatedProb: importanceProb,
        variance: isVarEstimator,
        confidenceInterval: isCI,
        totalHits: isHits
      });

      setBatchRunning(false);
    }, 100); // Small delay to unblock render
  };

  // Auto-run single paths when params change (optional, better manual)
  useEffect(() => {
    // Clear paths on param change
    setNaivePath([]);
    setIsPath([]);
  }, [params]);

  return (
    <div className="flex flex-col h-full space-y-6 pb-10">
      
      <EducationPanel />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Control Panel (Left) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-6 overflow-y-auto max-h-[850px]">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator size={20} />
              仿真参数控制
            </h2>
          </div>

          <div className="space-y-5 border-b border-slate-100 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">基线 β₀</label>
                <input
                  type="number" step="0.1"
                  value={params.beta0}
                  onChange={(e) => setParams({ ...params, beta0: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">反馈 β₁</label>
                <input
                  type="number" step="0.05"
                  value={params.beta1}
                  onChange={(e) => setParams({ ...params, beta1: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded mt-1"
                />
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                 大偏差阈值 (a)
                 <span className="text-blue-600">Event: Mean &gt; {params.threshold.toFixed(1)}</span>
              </label>
              <input
                type="range" min="1" max="20" step="0.1"
                value={params.threshold}
                onChange={(e) => setParams({ ...params, threshold: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Easy (1.0)</span>
                <span>Rare (20.0)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">步数 (n)</label>
                 <input
                   type="number"
                   value={params.steps}
                   onChange={(e) => setParams({ ...params, steps: parseInt(e.target.value) })}
                   className="w-full p-2 border border-slate-300 rounded mt-1"
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">截断 (N)</label>
                 <input
                   type="number"
                   value={truncationN}
                   onChange={(e) => setTruncationN(parseInt(e.target.value))}
                   className="w-full p-2 border border-slate-300 rounded mt-1"
                 />
               </div>
            </div>
            
            <button
               onClick={solveParameters}
               disabled={computing}
               className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-sm mt-2"
             >
               {computing ? "求解中..." : "1. 求解最优参数 (Compute θ*)"}
            </button>
            
            {/* Solver Logs */}
            <div className="bg-slate-950 text-green-400 p-3 rounded-lg font-mono text-xs overflow-y-auto max-h-[100px] border border-slate-800">
                {solutionLog.length === 0 && <span className="text-slate-600 opacity-50">等待求解...</span>}
                {solutionLog.map((log, i) => <div key={i}>{log}</div>)}
                {errorMsg && <div className="text-red-400 mt-2">Error: {errorMsg}</div>}
            </div>
          </div>

          {/* Section: Single Path Visuals */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-900 border-l-4 border-purple-500 pl-2">
               阶段 A: 单次路径可视化
             </h3>
             <p className="text-xs text-slate-500">
               生成一条单独的路径，观察朴素方法与 IS 方法在样本均值轨迹上的直观区别。
             </p>
             <div className="grid grid-cols-2 gap-2">
               <button
                 onClick={generateSingleNaive}
                 className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 px-2 rounded-lg text-xs font-medium"
               >
                 运行单次 Naive
               </button>
               <button
                 onClick={generateSingleIS}
                 disabled={!optimalTheta}
                 className={`py-2 px-2 rounded-lg text-xs font-medium border ${!optimalTheta ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
               >
                 运行单次 IS (Doob-h)
               </button>
             </div>
          </div>

          {/* Section: Batch Monte Carlo */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
             <h3 className="text-sm font-bold text-slate-900 border-l-4 border-indigo-500 pl-2">
               阶段 B: 蒙特卡洛实验 (Batch)
             </h3>
             <p className="text-xs text-slate-500">
               自动运行大量模拟，计算 P(S_n/n &gt; a) 的统计估计值。
             </p>
             
             <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 whitespace-nowrap">实验次数 (M):</label>
                <input
                   type="number"
                   value={params.numTrials}
                   onChange={(e) => setParams({ ...params, numTrials: parseInt(e.target.value) })}
                   className="w-full p-1.5 border border-slate-300 rounded text-sm"
                 />
             </div>

             <button
               onClick={runBatchExperiment}
               disabled={!optimalTheta || batchRunning}
               className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm text-white
                 ${!optimalTheta || batchRunning ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'}`}
             >
               {batchRunning ? (
                 <>
                    <FlaskConical className="animate-spin" size={18}/> 实验进行中...
                 </>
               ) : (
                 <>
                    <Play size={18} fill="currentColor"/> 开始蒙特卡洛实验
                 </>
               )}
             </button>
          </div>

        </div>

        {/* Visualization Area (Right) */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto">
          
          {/* 1. Results Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Naive Result */}
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                  <span>朴素蒙特卡洛 (Naive MC)</span>
                  <span className="text-slate-300">M={params.numTrials}</span>
                </h3>
                
                <div className="mt-4 flex flex-col gap-1">
                   <span className="text-3xl font-bold text-slate-800">
                     {naiveBatchRes ? naiveBatchRes.estimatedProb.toExponential(4) : "--"}
                   </span>
                   <span className="text-xs text-slate-400">估计概率 P(Sn/n &gt; a)</span>
                </div>

                {naiveBatchRes && (
                   <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>命中次数 (Hits):</span>
                        <span className="font-mono">{naiveBatchRes.totalHits} / {params.numTrials}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>95% CI:</span>
                        <span className="font-mono text-[10px]">
                           [{naiveBatchRes.confidenceInterval[0].toExponential(2)}, {naiveBatchRes.confidenceInterval[1].toExponential(2)}]
                        </span>
                      </div>
                      {naiveBatchRes.totalHits === 0 && (
                        <div className="text-amber-600 font-medium mt-1">
                          警告: 未发生稀有事件，估计无效。
                        </div>
                      )}
                   </div>
                )}
             </div>

             {/* IS Result */}
             <div className="bg-indigo-600 p-5 rounded-xl border border-indigo-700 shadow-sm text-white relative overflow-hidden">
                <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wide flex justify-between">
                  <span>重要性采样 (IS Estimate)</span>
                  <span className="text-indigo-300">M={params.numTrials}</span>
                </h3>

                <div className="mt-4 flex flex-col gap-1">
                   <span className="text-3xl font-bold text-white">
                     {isBatchRes ? isBatchRes.estimatedProb.toExponential(4) : "--"}
                   </span>
                   <span className="text-xs text-indigo-200">加权估计概率 (Weighted)</span>
                </div>

                {isBatchRes && (
                   <div className="mt-4 pt-3 border-t border-indigo-500/30 text-xs text-indigo-100 space-y-1">
                      <div className="flex justify-between">
                        <span>有效样本 (Q Hits):</span>
                        <span className="font-mono">{isBatchRes.totalHits} / {params.numTrials}</span>
                      </div>
                      {naiveBatchRes && naiveBatchRes.variance > 0 && isBatchRes.variance > 0 ? (
                        <div className="flex justify-between font-bold text-green-300 mt-2 bg-indigo-700/50 p-1.5 rounded">
                           <span>方差缩减 (VRF):</span>
                           <span>{ (naiveBatchRes.variance / isBatchRes.variance).toFixed(1) }x</span>
                        </div>
                      ) : (
                        <div className="flex justify-between font-medium text-indigo-300 mt-2">
                           <span>方差缩减 (VRF):</span>
                           <span>--</span>
                        </div>
                      )}
                   </div>
                )}
             </div>
          </div>
          
          {/* Analysis Panel - New Component */}
          <AnalysisPanel 
             naiveRes={naiveBatchRes} 
             isRes={isBatchRes} 
             theta={optimalTheta} 
             threshold={params.threshold}
          />

          {/* 2. Sample Mean Process Chart (NEW) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 size={20} className="text-indigo-600"/>
                  样本均值收敛过程 (Sample Mean Trajectory)
                </h3>
                <p className="text-xs text-slate-500">
                  监控 $S_t / t$ 随时间 $t$ 的变化。稀有事件定义为最终点 (t={params.steps}) 在红线之上。
                </p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="t" 
                    type="number" 
                    domain={[1, params.steps]} 
                    stroke="#94a3b8" 
                    label={{ value: '时间步 (t)', position: 'insideBottom', offset: -5, fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    label={{ value: '累积均值 St/t', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                  />
                  <ReferenceLine 
                    y={params.threshold} 
                    stroke="red" 
                    strokeDasharray="3 3" 
                    strokeWidth={2}
                  >
                     <Label value={`Threshold a=${params.threshold}`} position="insideTopRight" fill="red" fontSize={12} />
                  </ReferenceLine>
                  
                  {naivePath.length > 0 && (
                    <Line 
                      data={naivePath} 
                      type="monotone" 
                      dataKey="runningMean" 
                      name="Naive Mean" 
                      stroke="#cbd5e1" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  )}
                  {isPath.length > 0 && (
                    <Line 
                      data={isPath} 
                      type="monotone" 
                      dataKey="runningMean" 
                      name="IS Mean (Twisted)" 
                      stroke="#4f46e5" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  )}
                  <Legend verticalAlign="top" height={36} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Original Path Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">原始路径 (X_t)</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="t" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                  
                  {naivePath.length > 0 && (
                    <Line data={naivePath} type="stepAfter" dataKey="Xt" name="Naive X_t" stroke="#cbd5e1" strokeWidth={1} dot={false} />
                  )}
                  {isPath.length > 0 && (
                    <Line data={isPath} type="stepAfter" dataKey="Xt" name="IS X_t" stroke="#4f46e5" strokeWidth={1} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};