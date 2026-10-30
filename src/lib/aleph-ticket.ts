/** Public Aleph MoCoMo admission ticket shown on /aleph. */

export const ALEPH_PATH = "/aleph";

export const ALEPH_TITLE = "MoCoMo × Aleph";

export const ALEPH_PUBLIC_AGENT_SIG = "MoCoMo-Aleph-public-2026";

export const ALEPH_VERSION = "1.0.0";

export const ALEPH_VERSION_LABEL = "v1.0.0-alpha";

export const ALEPH_TICKET_COMMAND = [
  `# MoCoMo Aleph Public Access Token (v${ALEPH_VERSION})`,
  `$env:M2M_AGENT_SIG="${ALEPH_PUBLIC_AGENT_SIG}"`,
  `$env:ALEPH_VERSION="${ALEPH_VERSION}"`,
].join("\n");
