workspace "holdem" "Embeddable NLHE engine. ADL authority for O(1) plugins + R_manual. Hosts are compose." {

    !identifiers hierarchical

    model {
        operator = person "Human or Agent" "Human: GitHub OAuth + H5. Agent: table token + MCP/HTTP."

        holdem = softwareSystem "holdem" "Headless NLHE; host adapters are thin compose" {

            group "L2 — composition" {
                app = container "App" "Session: sit → hands → stand" "TypeScript" {
                    tags "Compose"
                    properties {
                        "path" "src/app/"
                        "role" "compose"
                        "horizon.intention" "Own table session; no street rules"
                    }
                }

                runtime = container "Runtime" "Dispatch contracts along hand_order" "TypeScript" {
                    tags "Compose"
                    properties {
                        "path" "src/runtime/"
                        "role" "compose"
                        "horizon.intention" "Wire plugins; no business rules"
                    }
                }

                hosts = container "Hosts" "web = simple H5; agent = MCP+HTTP autoplay; cli wraps HTTP" "TypeScript" {
                    tags "Compose"
                    properties {
                        "path" "src/hosts/"
                        "role" "compose"
                        "horizon.intention" "Same SeatView/ActionIntent; never own pot math. Cursor auto-play uses agent tools, not DOM."
                    }
                }
            }

            group "L2 — contracts + infra" {
                contracts = container "Contracts" "DTO + ports: Deal, Betting, Evaluate, Bank, Seat" "TypeScript" {
                    tags "Contracts"
                    properties {
                        "path" "src/contracts/"
                        "role" "contracts"
                    }
                }

                config = container "Config" "Blinds, max seats, timebank — data not a plugin" "TypeScript" {
                    tags "Infra"
                    properties {
                        "path" "src/config/"
                        "role" "infra"
                    }
                }

                auth = container "Auth" "GitHub OAuth + table tokens + star check. Not a plugin." "TypeScript" {
                    tags "Infra"
                    properties {
                        "path" "src/auth/"
                        "role" "infra"
                        "horizon.intention" "Identity + starred?; credit via BankPort, never bank→GitHub"
                    }
                }
            }

            group "L2 — plugins (out-degree O(1))" {
                deckPlugin = container "Deck" "Shuffle + deal hole/board" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/deck/"
                        "role" "plugin"
                        "horizon.deps" "contracts"
                    }
                }

                evaluatePlugin = container "Evaluate" "5-of-7 hand rank" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/evaluate/"
                        "role" "plugin"
                        "horizon.deps" "contracts"
                    }
                }

                bettingPlugin = container "Betting" "Legal actions, pot, to-call" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/betting/"
                        "role" "plugin"
                        "horizon.deps" "contracts + config"
                    }
                }

                dealerPlugin = container "Dealer" "Street FSM" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/dealer/"
                        "role" "plugin"
                        "horizon.deps" "contracts + config"
                    }
                }

                bankPlugin = container "Bank" "Stacks, blinds, settle" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/bank/"
                        "role" "plugin"
                        "horizon.deps" "contracts + config"
                    }
                }

                seatPlugin = container "Seat" "Player port: SeatView / ActionIntent" "TypeScript" {
                    tags "Plugin"
                    properties {
                        "path" "src/seat/"
                        "role" "plugin"
                        "horizon.deps" "contracts"
                    }
                }
            }
        }

        operator -> hosts "act / observe"
        hosts -> runtime "uses"
        hosts -> auth "uses"
        app -> runtime "uses"
        app -> hosts "wires"
        app -> auth "uses"
        runtime -> contracts "dispatches"
        deckPlugin -> contracts "implements"
        evaluatePlugin -> contracts "implements"
        bettingPlugin -> contracts "implements"
        bettingPlugin -> config "uses"
        dealerPlugin -> contracts "implements"
        dealerPlugin -> config "uses"
        bankPlugin -> contracts "implements"
        bankPlugin -> config "uses"
        seatPlugin -> contracts "implements"
    }

    views {
        systemContext holdem "SystemContext" {
            include *
            autoLayout
        }

        container holdem "Containers" {
            include *
            autoLayout
        }

        styles {
            element "Person" { shape Person }
            element "Plugin" { background #1168bd color #ffffff }
            element "Compose" { background #438dd5 color #ffffff }
            element "Contracts" { background #85bbf0 color #000000 }
            element "Infra" { background #999999 color #ffffff }
        }
    }
}
