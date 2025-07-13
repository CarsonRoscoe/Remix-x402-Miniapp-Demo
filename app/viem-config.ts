import { createConfig, http } from '@wagmi/core'
import { base } from '@wagmi/core/chains'
import { type Config } from '@wagmi/core'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  }
}) as Config