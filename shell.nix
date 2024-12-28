{pkgs ? import <nixpkgs> {}}:
pkgs.mkShell {
  packages = [
    # standard toolkit
    pkgs.nodejs # nixpkgs provides a "nodejs" package that corresponds to the current LTS version of nodejs, but you can specify a version (i.e node_20) if necessary
    # pkgs.yarn
    pkgs.pnpm # a faster alternative to npm and yarn, with a less adopted toolchain

    # optionally required by your code editor to lint and format your code
    pkgs.nodePackages.prettier # formatter
    pkgs.nodePackages.eslint # linter
    pkgs.nodePackages.svelte-language-server

    # example package to serve a static nextjs export
    pkgs.nodePackages.serve
  ];
}
