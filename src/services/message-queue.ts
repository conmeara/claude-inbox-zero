/**
 * MessageQueue - Async queue for serializing operations
 * Adopted from Anthropic's email-agent sample (claude-code-sdk-demos)
 *
 * Prevents race conditions by ensuring tasks are processed sequentially.
 * Perfect for preventing concurrent SDK queries on the same email session.
 */
export class MessageQueue<T> {
  private queue: T[] = [];
  private waitingResolvers: Array<(result: { value: T; done: false } | { done: true }) => void> = [];
  private closed = false;

  /**
   * Add an item to the queue
   * If a consumer is waiting, deliver immediately
   * Otherwise, queue for later consumption
   */
  async push(item: T): Promise<void> {
    if (this.closed) {
      throw new Error("Queue is closed");
    }

    const resolver = this.waitingResolvers.shift();
    if (resolver) {
      resolver({ value: item, done: false });
    } else {
      this.queue.push(item);
    }
  }

  /**
   * Get the next item from the queue
   * If queue is empty, wait for next push
   * Returns {done: true} if queue is closed and empty
   */
  async next(): Promise<{ value: T; done: false } | { done: true }> {
    if (this.queue.length > 0) {
      return { value: this.queue.shift()!, done: false };
    }

    if (this.closed) {
      return { done: true };
    }

    return new Promise((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  /**
   * Close the queue - no more items can be added
   * All pending consumers will receive {done: true}
   * This prevents memory leaks from hanging promises
   */
  close() {
    this.closed = true;

    // Resolve all pending promises with {done: true} to signal completion
    const resolvers = [...this.waitingResolvers];
    this.waitingResolvers = [];

    resolvers.forEach(resolve => {
      resolve({ done: true });
    });

    // Clear any remaining queued items
    this.queue = [];
  }

  /**
   * Check if queue is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Get current queue length
   */
  length(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
