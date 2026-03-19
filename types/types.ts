/**
 * KeyPoint 介面定義人體關鍵點的位置和可見度
 * x, y, z: 三維空間中的座標
 * visibility: 可見度值，範圍 0-1
 */
export interface KeyPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/**
 * Pose 介面定義人體姿勢，包含多個關鍵點
 * 每個關鍵點以字串索引表示身體部位
 */
export interface Pose {
  [key: string]: KeyPoint;
}
