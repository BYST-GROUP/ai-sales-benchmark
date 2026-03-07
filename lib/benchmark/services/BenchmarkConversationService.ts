import { BenchmarkConversationService } from '@/lib/benchmark/types'
import { BENCHMARK_LLM_MODE } from '@/lib/benchmark/config'
import { MultiLlmBenchmarkConversationService } from '@/lib/benchmark/services/MultiLlmBenchmarkConversationService'
import { SingleLlmBenchmarkConversationService } from '@/lib/benchmark/services/SingleLlmBenchmarkConversationService'

export type { BenchmarkConversationService }

/**
 * Factory — returns the correct service implementation based on BENCHMARK_LLM_MODE.
 */
export function getBenchmarkService(): BenchmarkConversationService {
  if (BENCHMARK_LLM_MODE === 'single') {
    return new SingleLlmBenchmarkConversationService()
  }
  return new MultiLlmBenchmarkConversationService()
}
