declare module 'ml-kmeans' {
  export interface KMeansOptions {
    initialization?: 'kmeans++' | 'random' | 'mostDistant';
    maxIterations?: number;
    tolerance?: number;
    seed?: number;
  }

  export interface KMeansResult {
    clusters: number[];
    centroids: number[][];
    converged: boolean;
    iterations: number;
  }

  function KMeans(
    data: number[][],
    k: number,
    options?: KMeansOptions
  ): KMeansResult;

  export default KMeans;
}

