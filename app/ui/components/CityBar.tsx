import { CITY_GROUPS, datasetByCity } from "../data-index";

type Props = {
  city: string;
  countByCity: Record<string, number>;
  onCity: (province: string, city: string) => void;
};

// 按省分组的城市条；每个城市只显示当前条件下的岗位数
export function CityBar({ city, countByCity, onCity }: Props) {
  return (
    <div className="city-bar" role="group" aria-label="按城市查看">
      <button type="button" className={`city-chip${city === "全部" ? " active" : ""}`} aria-pressed={city === "全部"}
        onClick={() => onCity("全部", "全部")}>
        全部城市
      </button>
      {CITY_GROUPS.map((group) => (
        <div key={group.province} className="city-group">
          <span className="city-province">{group.province}</span>
          {group.cityNames.map((name) => {
            const count = countByCity[name] ?? 0;
            return (
              <button key={name} type="button" className={`city-chip${city === name ? " active" : ""}${count === 0 ? " is-empty" : ""}`}
                aria-pressed={city === name} onClick={() => onCity(datasetByCity.get(name)?.province ?? group.province, name)}
                aria-label={`${name}，${count} 个岗位`}>
                {name}<span className="city-count" aria-hidden="true">{count}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
