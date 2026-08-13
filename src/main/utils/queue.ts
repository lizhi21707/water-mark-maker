/** 简单并发队列：最多 limit 个 worker 同时执行，worker 抛错不影响后续任务 */
export interface TaskQueue<T> {
  push(item: T): void
  clear(): void
  /** 等待所有已入队任务完成 */
  drain(): Promise<void>
}

export function createQueue<T>(limit: number, worker: (item: T) => Promise<void>): TaskQueue<T> {
  const pending: T[] = []
  let running = 0
  let idleResolvers: Array<() => void> = []

  const pump = (): void => {
    while (running < limit && pending.length > 0) {
      const item = pending.shift() as T
      running++
      worker(item)
        .catch((err) => {
          console.error('[queue] worker error:', err)
        })
        .finally(() => {
          running--
          if (pending.length === 0 && running === 0) {
            idleResolvers.forEach((r) => r())
            idleResolvers = []
          }
          pump()
        })
    }
  }

  return {
    push(item: T): void {
      pending.push(item)
      pump()
    },
    clear(): void {
      pending.length = 0
    },
    drain(): Promise<void> {
      return new Promise((resolve) => {
        if (pending.length === 0 && running === 0) resolve()
        else idleResolvers.push(resolve)
      })
    }
  }
}
