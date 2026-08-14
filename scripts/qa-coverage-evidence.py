# 覆盖检索证据质检：抓取每条 evidence 链接，检查可达性与学科关键词命中。
# 用法：python3 scripts/qa-coverage-evidence.py <work/xxx-coverage.json>
import json
import re
import subprocess
import sys
import concurrent.futures

KEYWORDS = ["政治", "道法", "道德与法治", "思想政治", "经济", "商科", "历史教师", "历史老师",
            "人文", "社科", "全球视野", "Global Perspectives", "Economics", "Business Studies", "History Teacher"]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def probe(entry):
    url = entry.get("evidence") or ""
    if not url:
        return {**entry, "http": -1, "len": 0, "title": "", "hits": [], "note": "无证据链接"}
    try:
        out = subprocess.run(
            ["curl", "-skL", "--max-time", "20", "-A", UA, url],
            capture_output=True, text=True, timeout=30)
        body = (out.stdout or "")[:80000]
        m = re.search(r"<title[^>]*>([^<]{0,120})", body, re.I)
        title = (m.group(1) or "").strip() if m else ""
        hits = [k for k in KEYWORDS if k.lower() in body.lower()]
        return {**entry, "http": out.returncode, "len": len(body), "title": title, "hits": hits}
    except Exception as e:
        return {**entry, "http": -1, "len": 0, "title": "", "hits": [], "err": str(e)[:60]}


def main():
    path = sys.argv[1]
    data = json.load(open(path, encoding="utf-8"))
    entries = data["entries"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(probe, entries))

    verdict = []
    for r in results:
        alive = r["len"] > 1000
        hit = len(r["hits"]) > 0
        if not alive:
            mark = "DEAD"
        elif hit:
            mark = "HIT "
        else:
            mark = "NOKW"
        print(f"{mark:4s} {r.get('district','?'):4s} {r['name'][:26]:28s} hits={len(r['hits'])} {r['title'][:46]}")
        if r["hits"]:
            print(f"      -> {r['hits']}")
        verdict.append({**r, "verdict": mark})

    out_path = path.replace("-coverage.json", "-coverage-qa.json")
    json.dump(verdict, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    counts = {}
    for r in results:
        key = r["outcome"]
        counts.setdefault(key, [0, 0, 0])
        counts[key][0] += 1
        if r["len"] > 1000:
            counts[key][1] += 1
        if r["hits"]:
            counts[key][2] += 1
    print("\n分类统计（总数 / 证据可达 / 关键词命中）：", counts)
    print("saved:", out_path)


if __name__ == "__main__":
    main()
