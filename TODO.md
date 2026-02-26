# Chachi - Open Issues Prioritized

> Generated from GitHub issues on 2026-02-26
> Repo: purrgrammer/chachi

## Recent Work (2026-02-26)

### AUTH System Complete ✅
- ✅ Implemented RelayAuthManager state machine
- ✅ NDK adapter layer with RxJS Observable bridges
- ✅ Interactive auth toast prompts with proper styling
- ✅ Relay preferences UI (single-line dropdown controls)
- ✅ Per-relay user preferences (always/never/ask)
- ✅ LocalStorage persistence across sessions
- ✅ i18n support and accessibility (aria-labels)
- ✅ **CLOSED #67** - AUTH improvements (user control + UX)
- ✅ **CLOSED #65** - Only AUTH when relay requests it (reactive, not proactive)
- 📝 Note: AUTH infinite loops (#80) still requires investigation

### Direct Messages (NIP-17) Improvements ✅
- ✅ Fixed gift wrap receiving (messages now appear on receiver side)
- ✅ Added comprehensive relay discovery with 7-step fallback chain
- ✅ Improved DM subscription logging and error visibility
- ✅ Switched to limit-based sync (500 messages) instead of time-based filters
- ✅ Added signer and relay availability checks before subscription
- ✅ Simplified send error handling (removed dangerous "treat failure as success" logic)
- ✅ Performance optimizations using compound indexes for unread counts
- ✅ Created `useGroupRelaySetMap` for efficient per-recipient relay routing
- 🔧 **PROGRESS #84** - NIP-17 relay improvements (receiving fixed, discovery enhanced)
- 🔧 **PROGRESS #72** - Better DM UX (comprehensive logging, error visibility)

## LG - High Priority

Critical bugs, security/privacy concerns, and core UX blockers.

| # | Type | Title | Labels |
|---|------|-------|--------|
| [#80](https://github.com/purrgrammer/chachi/issues/80) | bug | AUTH failures and infinite retries in a loop | bug |
| [#74](https://github.com/purrgrammer/chachi/issues/74) | bug | Clicking the "Send" button in the wallet freezes the app | bug |
| [#78](https://github.com/purrgrammer/chachi/issues/78) | bug | Creating a closed group locks creator out of the group | bug |
| [#38](https://github.com/purrgrammer/chachi/issues/38) | bug | When sending from ecash wallet and failing, a success message shows | bug, ecash, wallet |
| [#84](https://github.com/purrgrammer/chachi/issues/84) | bug | NIP-17 relay list kind review findings (silent message drops) | - |
| [#57](https://github.com/purrgrammer/chachi/issues/57) | bug | DMs open one relay connection each time we send a message | bug |
| ~~[#65](https://github.com/purrgrammer/chachi/issues/65)~~ | ~~bug~~ | ~~Don't require AUTH if the relay doesn't need it~~ - **✅ CLOSED** | ~~bug~~ |
| ~~[#67](https://github.com/purrgrammer/chachi/issues/67)~~ | ~~enhancement~~ | ~~AUTH improvements (privacy/security)~~ - **✅ CLOSED** | ~~enhancement~~ |
| [#70](https://github.com/purrgrammer/chachi/issues/70) | enhancement | Relay connection management (scoring, connection pooling) | enhancement |
| [#51](https://github.com/purrgrammer/chachi/issues/51) | enhancement | Cold load improvements (first-run UX) | enhancement |
| [#72](https://github.com/purrgrammer/chachi/issues/72) | enhancement | Better UX for direct messages (delivery tracking, relay visibility) | enhancement |

## MD - Medium Priority

Important UX improvements, moderate bugs, and user-facing enhancements.

| # | Type | Title | Labels |
|---|------|-------|--------|
| [#81](https://github.com/purrgrammer/chachi/issues/81) | bug | Make sure input box is refocused after hitting Enter | bug, good first issue |
| [#58](https://github.com/purrgrammer/chachi/issues/58) | bug | Chat message box should recover focus after sending message | bug |
| [#87](https://github.com/purrgrammer/chachi/issues/87) | bug | Take into account all NIP-29 chat events for unread syncing | bug |
| [#76](https://github.com/purrgrammer/chachi/issues/76) | bug | Make sure to fetch up to date communikey profiles on startup | bug |
| [#75](https://github.com/purrgrammer/chachi/issues/75) | bug | Communikey post shows "Unknown" instead of Communikey | bug |
| [#52](https://github.com/purrgrammer/chachi/issues/52) | bug | Reaction button in chat message doesn't respond on click | bug |
| [#39](https://github.com/purrgrammer/chachi/issues/39) | bug | Disable send button while sending | bug, wallet |
| [#45](https://github.com/purrgrammer/chachi/issues/45) | bug | Nested embeds overflow their container | bug |
| [#34](https://github.com/purrgrammer/chachi/issues/34) | bug | VPN users not seeing full message history of NIP-29 groups | bug |
| [#43](https://github.com/purrgrammer/chachi/issues/43) | bug | Communikey creation modal should be scrollable | bug, good first issue |
| [#73](https://github.com/purrgrammer/chachi/issues/73) | enhancement | "Get started" on group invite page should allow login | enhancement |
| [#71](https://github.com/purrgrammer/chachi/issues/71) | enhancement | Allow retrying messages that failed to send | enhancement |
| [#37](https://github.com/purrgrammer/chachi/issues/37) | enhancement | Resend option after "Failed to Send" | enhancement |
| [#27](https://github.com/purrgrammer/chachi/issues/27) | enhancement | Unread notifications view | enhancement |
| [#53](https://github.com/purrgrammer/chachi/issues/53) | enhancement | Adjust mobile styles (width/height issues) | enhancement |
| [#68](https://github.com/purrgrammer/chachi/issues/68) | enhancement | Use modal nstart integration | enhancement, good first issue |

## SM - Small Priority

Nice-to-haves, niche features, and lower-impact improvements.

| # | Type | Title | Labels |
|---|------|-------|--------|
| [#79](https://github.com/purrgrammer/chachi/issues/79) | enhancement | Add option to broadcast events to other relays | enhancement |
| [#69](https://github.com/purrgrammer/chachi/issues/69) | enhancement | Use author's outbox relays for fetching emoji sets | enhancement |
| [#61](https://github.com/purrgrammer/chachi/issues/61) | enhancement | "Is typing" indicator | enhancement |
| [#60](https://github.com/purrgrammer/chachi/issues/60) | enhancement | WebRTC calls on 1on1 private conversations | enhancement |
| [#54](https://github.com/purrgrammer/chachi/issues/54) | enhancement | Redeem ecash from an untrusted mint | enhancement, ecash |
| [#50](https://github.com/purrgrammer/chachi/issues/50) | enhancement | Render lightning invoices | enhancement, good first issue |
| [#49](https://github.com/purrgrammer/chachi/issues/49) | enhancement | Detail view should render cached events if available | enhancement |
| [#47](https://github.com/purrgrammer/chachi/issues/47) | enhancement | Support sending encrypted files in NIP-17 DMs | enhancement |
| [#46](https://github.com/purrgrammer/chachi/issues/46) | enhancement | Fine-grained control when uploading files | enhancement |
| [#44](https://github.com/purrgrammer/chachi/issues/44) | enhancement | RTL language support | enhancement |
| [#36](https://github.com/purrgrammer/chachi/issues/36) | enhancement | Land on Notification on Mobile | enhancement |
| [#30](https://github.com/purrgrammer/chachi/issues/30) | enhancement | Support nested indexes in Book events | enhancement |
| [#29](https://github.com/purrgrammer/chachi/issues/29) | enhancement | Properly render asciidoc | enhancement, good first issue |
| [#86](https://github.com/purrgrammer/chachi/issues/86) | enhancement | Creating groups in arbitrary relays (partially addressed) | - |

## Summary

| Priority | Bugs | Enhancements | Total |
|----------|------|--------------|-------|
| LG | 6 | 3 | **9** |
| MD | 10 | 6 | **16** |
| SM | 0 | 14 | **14** |
| **Total** | **16** | **23** | **39** |

**Recently Closed:** 2 (#65, #67)

### Suggested Focus Areas

1. **AUTH system** (#80) - ~~#65, #67 CLOSED~~ - Remaining: infinite retry loops investigation
2. **Message reliability** (#84, #57, #71, #37) - Silent message drops, relay connection leaks, and no retry mechanism
3. **Wallet/ecash** (#74, #38, #39) - App freeze, false success on failure, missing send-button guard
4. **Input focus** (#81, #58) - Two issues reporting the same core problem: input loses focus after send
5. **First-run experience** (#51, #68, #73) - Cold load, onboarding modal, and invite page login flow
