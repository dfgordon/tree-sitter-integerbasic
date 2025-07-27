# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### New Features

* maintenance update for compatibility with tree-sitter 0.25

### Breaking Changes

* calls to the rust `set_language` function need to be updated

## [2.0.0] - 2024-07-26

### New Features

* maintenance update for compatibility with tree-sitter 0.22

### Breaking Changes

* the dependency on tree-sitter 0.22 will break older code

## [1.1.1] - 2024-04-21

This release was a SEMVER violation that had to be yanked from crates.io.

### New Features

* accepts immediate mode commands
    - downstream can filter tokens with `com_` prefix as desired

## [1.0.3] - 2023-11-26

Initial release

## [Unreleased] - 2022-01-23

Initial commit