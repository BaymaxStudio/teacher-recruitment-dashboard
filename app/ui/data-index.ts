// 界面用的数据索引：把各城市数据集拍平成按 id 查找的表，模块加载时计算一次。
import { allPositions, cityDatasets, multiCityDataset, todayInUtc8 } from "../recruitment-data";

export const allDatasets = [...cityDatasets, multiCityDataset];
export const datasetByCity = new Map(cityDatasets.map((dataset) => [dataset.cityName, dataset]));
export const schools = allDatasets.flatMap((dataset) => dataset.schools);
export const schoolById = new Map(schools.map((school) => [school.id, school]));
export const batchById = new Map(allDatasets.flatMap((dataset) => dataset.batches).map((batch) => [batch.id, batch]));
export const evidenceById = new Map(allDatasets.flatMap((dataset) => dataset.evidence).map((item) => [item.id, item]));
export const positionById = new Map(allPositions.map((position) => [position.id, position]));
export const statusAsOf = todayInUtc8();

export const CITY_GROUPS = [
  { province: "广东", cityNames: ["广州", "深圳", "佛山", "珠海", "惠州", "东莞"] },
  { province: "浙江", cityNames: ["杭州", "宁波", "温州", "嘉兴", "绍兴"] },
  { province: "江苏", cityNames: ["南京", "苏州", "无锡"] },
] as const;
export const CITIES: string[] = CITY_GROUPS.flatMap((group) => [...group.cityNames]);

export { allPositions, cityDatasets };
