"use client";

import { AppFrame } from "@/components/app-frame";
import { useAppData } from "@/components/providers/app-data-provider";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export function HistoryView() {
  const { isReady, records, restaurants } = useAppData();

  return (
    <AppFrame
      title="吃饭记录"
      description="接受推荐后的记录会自动落库，后续推荐也会基于这些数据做冷却处理。"
    >
      <div className="single-column-grid">
        <div className="card">
          <div className="section-heading">
            <h2>历史列表</h2>
            <p>{records.length} 条记录已保存到本地浏览器。</p>
          </div>

          {!isReady ? <p className="muted-copy">正在读取历史记录...</p> : null}

          {isReady && records.length === 0 ? (
            <div className="empty-state">
              <h3>还没有吃饭记录</h3>
              <p>在推荐页点击“今天就吃这个”后，这里会自动追加一条记录。</p>
            </div>
          ) : null}

          <div className="stack-list">
            {records.map((record) => {
              const restaurant = restaurants.find((item) => item.id === record.restaurantId);

              return (
                <article key={record.id} className="history-card">
                  <div className="history-main">
                    <div>
                      <h3>{restaurant?.name ?? record.restaurantName}</h3>
                      <p className="card-copy">
                        {record.restaurantCategory || "未分类"} · {MEAL_TYPE_LABELS[record.mealType]}
                      </p>
                    </div>
                    <div className="chip-row">
                      <span className="chip">{record.date}</span>
                      <span className="chip subtle">
                        {record.acceptedFromRecommendation ? "推荐接受" : "手动记录"}
                      </span>
                    </div>
                  </div>
                  <p className="meta-copy">记录创建于 {formatDateTime(record.createdAt)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
