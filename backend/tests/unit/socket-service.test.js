import { describe, it, expect, vi, afterEach } from 'vitest'

import { socketService } from '../../services/socket.service.js'
import { logger } from '../../services/logger.service.js'

/**
 * socketService with no socket layer attached.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * `gIo` is assigned by `setupSocketAPI(server)`, which `server.js` calls and
 * `createApp()` does not. So any process that builds the app without starting
 * the full server — the entire test suite, and any future deployment that
 * serves the API without the socket layer — has `gIo === null`.
 *
 * Every emit path then reached `gIo.fetchSockets()` or `gIo.emit()` and threw
 * `Cannot read properties of null`. Because the callers do not always await,
 * that arrived as an unhandled rejection rather than as something a caller
 * could catch: Vitest reported "Errors: 20" and exited 1 while every test
 * passed.
 *
 * BUG-007 was one route hitting this. The route was fixed by moving its
 * broadcast past the response, but that only stops a socket failure from
 * changing THAT response. This is the other half, and the more general one: a
 * missing socket layer is not an error at all. Nobody is connected, so there
 * is nobody to notify, and the correct behaviour is to do nothing quietly.
 *
 * ── Why the module is used exactly as it ships ────────────────────────────
 * `setupSocketAPI` is never called here and `gIo` is not reachable from
 * outside the module, so the state under test is simply the state a freshly
 * imported module is already in. Nothing is stubbed to produce it, which means
 * the test cannot drift away from the real thing.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

describe('socketService without a socket layer', () => {
  /**
   * The whole surface, one row each. A guard added to two of the three
   * functions would look fixed and fail on the third, which is exactly how
   * this class of bug survives a partial fix.
   */
  it.each([
    ['emitTo', () => socketService.emitTo({ type: 'user-updated', data: {}, label: 'u1' })],
    ['emitTo (no label)', () => socketService.emitTo({ type: 'user-updated', data: {} })],
    ['emitToUser', () => socketService.emitToUser({ type: 'review-about-you', data: {}, userId: 'u1' })],
    ['broadcast', () => socketService.broadcast({ type: 'review-added', data: {}, userId: 'u1' })],
    ['broadcast (to a room)', () => socketService.broadcast({ type: 'review-added', data: {}, room: 'r1', userId: 'u1' })],
  ])('%s resolves instead of throwing', async (_label, call) => {
    // `resolves` rather than a bare call: two of these are async, so a throw
    // inside them would become a rejected promise and a synchronous
    // `expect(call).not.toThrow()` would pass while the process still logged
    // an unhandled rejection.
    await expect(Promise.resolve().then(call)).resolves.not.toThrow()
  })

  it('says it skipped the event, rather than failing silently', async () => {
    /**
     * The distinction that makes this a guard and not a swallow. "Nothing was
     * delivered because nobody is connected" is a fact someone reading the log
     * needs, and the event name is what makes it actionable — otherwise the
     * first person to debug a missing notification has no evidence the emit
     * was ever attempted.
     */
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {})

    await socketService.broadcast({ type: 'review-added', data: {}, userId: 'u1' })

    expect(info).toHaveBeenCalledWith(expect.stringContaining('review-added'))
  })

  it('does not touch the arguments it was given', async () => {
    /**
     * `emitToUser` and `broadcast` both start with `userId = userId.toString()`.
     * The guard has to come first, or a caller passing a null userId — which is
     * legitimate for an anonymous action — trades one TypeError for another and
     * nothing is actually fixed.
     */
    await expect(
      Promise.resolve().then(() =>
        socketService.broadcast({ type: 'review-added', data: {}, userId: null })
      )
    ).resolves.not.toThrow()
  })
})
