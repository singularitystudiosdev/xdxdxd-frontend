#!/bin/sh
# superbot bootstrap — one line for mac and linux:
#   curl -fsSL https://xdxdxd.dsh.sh/bootstrap.sh | sh
# Detects the OS and installs the Superbot desktop app — the one app that
# wires every AI client on the machine. There is no installer CLI on this
# origin any more, so nothing here touches node, npm or an rc file: the app
# owns the wiring. Re-running this exact line later IS the update.
# Flags: --no-launch (install, do not open) and --dry-run (print the resolved
# asset key, URL and destination, download nothing, exit 0 — needs no edge).
# Templates: https://xdxdxd.dsh.sh https://xdxdxd.dsh.sh/mcp — substituted by the edge on serve
# (edge/src/harness.ts substituteMcpUrl). POSIX sh throughout: the pipe target
# on Ubuntu is dash.

set -eu
ORIGIN='https://xdxdxd.dsh.sh'
MCP_URL='https://xdxdxd.dsh.sh/mcp'

# --- terminal frontend: the same 32x14 cat the CLI and the lander use, plus
# --- step markers and a spinner. Colors only when stdout is a terminal and
# --- NO_COLOR is unset (https://no-color.org); every primitive is POSIX.
have_color=0
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != dumb ]; then
  have_color=1
fi
step() {
  if [ "$have_color" = 1 ]; then printf '\033[38;5;108m▸ %s\033[0m\n' "$*";
  else printf '▸ %s\n' "$*"; fi
}
die() {
  if [ "$have_color" = 1 ]; then printf 'superbot bootstrap: \033[1;31m%s\033[0m\n' "$*" >&2;
  else printf 'superbot bootstrap: %s\n' "$*" >&2; fi
  exit 1
}

logo() {
  # The art cat is for humans at a terminal — an agent capturing the install
  # log gets only the facts block. The 11 rows between the ART sentinels are
  # byte-pinned to the CLI banner's default render (cli/scripts/gen-banner-art.mjs
  # --check); the facts block under it mirrors that banner's facts column.
  if [ -t 1 ]; then
  # ART:BEGIN
  cat <<'ART'
  .===:.                  .--:.
 .++**+*+:..............:=+**+*::
 :+*+++*++::==::::=::===*+*+++*=-
 :+*++*+=--====+=====::=+++====
 :=+++=-    --==+=:     .==++==
 =====:       ===+       :===++
 :+=+++:.   --+===-     :++====
 :=+++++:--:===+===::--:+++====
 -==++====+=====+=====+====++=:
  -:===+====++====+=====+==:::
      ..---------------...
ART
  # ART:END
  fi
  if [ "$have_color" = 1 ]; then
    printf ' \033[38;5;108msuperbot bootstrap\033[0m\n'
    printf ' \033[2morigin  \033[0m%s\n' "$ORIGIN"
    printf ' \033[2mremote  \033[0m%s\n' "$MCP_URL"
  else
    printf ' superbot bootstrap\n'
    printf ' origin  %s\n' "$ORIGIN"
    printf ' remote  %s\n' "$MCP_URL"
  fi
  printf '\n'
}

# spin <pid> <message> — a one-line spinner for a background job. TTY only
# (and not a dumb/NO_COLOR terminal): piped output gets the plain step line
# and the command's own silence. Color codes are inlined as plain assignments,
# not helpers, so no call site can dangle under dash.
spin() {
  _pid=$1
  _msg=$2
  _dim=''
  _off=''
  if [ "$have_color" = 1 ]; then _dim='\033[2m'; _off='\033[0m'; fi
  _i=0
  while kill -0 "$_pid" 2>/dev/null; do
    _f='|/-\'
    _c=$(printf '%s' "$_f" | cut -c$(( _i % 4 + 1 )))
    printf '\r%s  %c %s%s  ' "$_dim" "$_c" "$_msg" "$_off"
    _i=$((_i + 1))
    # busybox sleep can reject fractions without FEATURE_FANCY_SLEEP, and a
    # failing command in this loop would abort the whole install under set -e
    sleep 0.12 2>/dev/null || sleep 1
  done
  printf '\r\033[K'
}

# --- flags and platform --------------------------------------------------------
NO_LAUNCH=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --no-launch) NO_LAUNCH=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) die "unknown argument: $arg (known: --no-launch, --dry-run)" ;;
  esac
done

os=$(uname -s)
arch=$(uname -m)
case "$os/$arch" in
  Darwin/arm64|Darwin/aarch64) key=mac-arm64;   kind=dmg ;;
  Darwin/x86_64)               die "no Intel mac build yet — grab one from $ORIGIN/download." ;;
  Linux/x86_64|Linux/amd64)    key=linux-x64;   kind=appimage ;;
  *)                           die "no Superbot build for $os $arch — grab one from $ORIGIN/download." ;;
esac
url="$ORIGIN/download/asset/$key"

if [ "$DRY_RUN" = 1 ]; then
  case "$kind" in
    dmg)      dest="/Applications/Superbot.app (or ~/Applications when /Applications is read-only)" ;;
    appimage) dest="$HOME/.local/bin/superbot" ;;
  esac
  printf 'superbot bootstrap --dry-run\n'
  printf ' asset   %s\n' "$key"
  printf ' url     %s\n' "$url"
  printf ' dest    %s\n' "$dest"
  exit 0
fi

logo

# --- the download ---------------------------------------------------------------
# The edge answers /download/asset/<key> with a 302 to the release file; curl -L
# follows it. curl -f turns a non-2xx (404 when the release is private, a
# captive portal's block page) into an exit code; a captive portal that answers
# 200 with HTML is caught by the body sniff instead.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp" 2>/dev/null || true' EXIT
# the name is ours alone (a temp dir, gone at exit); hdiutil sniffs the
# format from the bytes, not the extension
tmpfile="$tmp/Superbot-installer"
step "downloading the Superbot app from $ORIGIN"
curl -fsSL "$url" -o "$tmpfile" &
_dl=$!
if [ "$have_color" = 1 ]; then spin "$_dl" "downloading Superbot"; fi
_rc=0
wait "$_dl" || _rc=$?
[ "$_rc" = 0 ] || die "could not fetch the installer from $ORIGIN — grab it from $ORIGIN/download"
if head -c 1 "$tmpfile" 2>/dev/null | grep -q '<'; then
  die "could not fetch the installer from $ORIGIN — grab it from $ORIGIN/download"
fi

# --- the install ----------------------------------------------------------------
case "$kind" in
  dmg)
    hdiutil imageinfo "$tmpfile" >/dev/null 2>&1 \
      || die "the download is not a macOS disk image — grab the installer from $ORIGIN/download."
    mnt="$tmp/mnt"
    mkdir -p "$mnt"
    hdiutil attach -nobrowse -readonly -quiet -mountpoint "$mnt" "$tmpfile" \
      || die "mounting the disk image failed — open $tmpfile by hand and drag Superbot.app to /Applications."
    app=$(find "$mnt" -maxdepth 2 -name 'Superbot.app' 2>/dev/null | head -n 1)
    if [ -z "$app" ]; then
      hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
      die "Superbot.app not found in the disk image — grab the installer from $ORIGIN/download."
    fi
    if [ -w /Applications ]; then dest=/Applications; else dest="$HOME/Applications"; fi
    mkdir -p "$dest"
    step "installing Superbot.app into $dest"
    rm -rf "$dest/Superbot.app"  # a stale copy keeps the old version's Helper wiring alive
    cp -R "$app" "$dest/" \
      || die "copying Superbot.app failed — drag it from $mnt by hand."
    hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
    app_path="$dest/Superbot.app"
    [ "$NO_LAUNCH" = 1 ] || open -a "$app_path"
    ;;
  appimage)
    bin="$HOME/.local/bin/superbot"
    mkdir -p "$(dirname "$bin")"
    step "installing the AppImage into $bin"
    cp "$tmpfile" "$bin"
    chmod +x "$bin"
    # On systems without FUSE the AppImage cannot mount its own squashfs; the
    # flag --appimage-extract-and-run runs it there. The desktop entry stays
    # plain — the launcher is the normal path, the flag is the escape hatch.
    apps="$HOME/.local/share/applications"
    mkdir -p "$apps"
    printf '%s\n' \
      '[Desktop Entry]' \
      'Type=Application' \
      'Name=Superbot' \
      'Comment=your AI clients, wired; the agent on call' \
      "Exec=$bin" \
      'Terminal=false' \
      'Categories=Network;Utility;' \
      > "$apps/superbot.desktop"
    app_path="$bin"
    if [ "$NO_LAUNCH" = 0 ]; then
      # detached: the app must outlive this shell (whose stdout the install
      # log owns), whether or not it was piped in
      nohup setsid "$bin" >/dev/null 2>&1 &
    fi
    ;;
esac

step "installed $app_path"
printf '  restart your AI clients so they pick up superbot\n'
