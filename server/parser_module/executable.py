from Search import searchByChart, searchByPlayer, searchAllPlayers, searchAllClears
from Core import Utils
import argparse, sys, json, os, io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()  # Convert datetime to ISO 8601 string
        return super().default(obj)

def save_to_json(data, filepath):
    with open(filepath, 'w', encoding="utf-8") as json_file:
        json.dump(data, json_file, cls=DateTimeEncoder, indent=4)

def custom_help():
    help_text = """
    Usage: python exec.py [COMMAND] [OPTIONS]

    Commands:
    chart                Search by chart ID
    player               Search by player name
    all_players          Search all players
    all_clears           Search all clears

    Options:
    --help               Show this help message and exit
    --useSaved           Use saved data
    --TwvKOnly           Filter results for 12K clears
    --reverse            Reverse sort order
    --minScore           Minimum score filter (for search all_clears)
    --showCharts         Display charts (for search player)
    --disableCharts      Disable charts display (for search all_players)
    --sortBy             Sort by a specific attribute (default is name for players, score for clears)
    --output             Specify file path to save the result to
    
    Available sort options:
        For Players:
            "rankedScore"
            "generalScore"
            "universalPasses"
            "ppScore"
            "wfScore"
            "12kScore"
            "avgXacc"
            "WFPasses"
            "totalPasses"
            "topDiff"
            "top12kDiff"
            "player"
            
        For Clears:
            "score"
            "Xacc"
            "pdnDiff"
            "date"


    Examples:
    Search by chart ID:          ./executable.exe chart 123 --useSaved
    Search by player name:       ./executable.exe player "Jipper" --TwvKOnly --showCharts
    Search all players:          ./executable.exe all_players --sortBy=player --reverse
    Search all clears:           ./executable.exe all_clears --minScore=500 --reverse --sortBy=Xacc
    """
    print(help_text)

PLAYER_SORT_OPTIONS = [
    "rankedScore", "generalScore", "universalPasses", "avgXacc",
    "WFPasses", "totalPasses", "topDiff", "top12kDiff", "player", "ppScore", "wfScore", "12kScore"
]
CLEAR_SORT_OPTIONS = ["score", "Xacc", "pdnDiff", "date"]

def validateSortOption(sortOption, validOptions, commandType):
    if sortOption not in validOptions:
        print(f"Error: Invalid sort option '{sortOption}' for {commandType}.")
        print(f"Valid options are: {', '.join(validOptions)}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Search commands", add_help=False)

    # Add a global --help option
    parser.add_argument('--help', action='store_true', help="Show help message")
    parser.add_argument('--output', type=str, help="Optional: specify output JSON file path")

    subparsers = parser.add_subparsers(dest="command")

    # Command for search by chart ID
    parserSearchChart = subparsers.add_parser('chart')
    parserSearchChart.add_argument('chart', type=int, help="Chart ID to search for")
    parserSearchChart.add_argument('--useSaved', action='store_true', help="Use saved data")
    parserSearchChart.add_argument('--output', type=str, help="Optional: specify output JSON file path")

    # Command for search by player
    parserSearchPlayer = subparsers.add_parser('player')
    parserSearchPlayer.add_argument('player', type=str, help="Player name to search for")
    parserSearchPlayer.add_argument('--sortBy', type=str, default='score', help="Sort by clear attribute")
    parserSearchPlayer.add_argument('--TwvKOnly', action='store_true', help="Only show 12K clears")
    parserSearchPlayer.add_argument('--showCharts', action='store_true', default=True, help="Show charts")
    parserSearchPlayer.add_argument('--useSaved', action='store_true', help="Use saved data")
    parserSearchPlayer.add_argument('--output', type=str, help="Optional: specify output JSON file path")

    # Command for search all players
    parserSearchAllPlayers = subparsers.add_parser('all_players')
    parserSearchAllPlayers.add_argument('--sortBy', type=str, default='rankedScore', help="Sort by player attribute")
    parserSearchAllPlayers.add_argument('--TwvKOnly', action='store_true', help="Only show 12K clears")
    parserSearchAllPlayers.add_argument('--disableCharts', action='store_true', default=False,
                                        help="Disable charts display")
    parserSearchAllPlayers.add_argument('--reverse', action='store_true', help="Reverse sort order")
    parserSearchAllPlayers.add_argument('--useSaved', action='store_true', help="Use saved data")
    parserSearchAllPlayers.add_argument('--output', type=str, help="Optional: specify output JSON file path")

    # Command for search all clears
    parserSearchAllClears = subparsers.add_parser('all_clears')
    parserSearchAllClears.add_argument('--sortBy', type=str, default='score', help="Sort by clear attribute")
    parserSearchAllClears.add_argument('--TwvKOnly', action='store_true', help="Only show TwvK data")
    parserSearchAllClears.add_argument('--minScore', type=int, default=0, help="Minimum score filter")
    parserSearchAllClears.add_argument('--reverse', action='store_true', help="Reverse sort order")
    parserSearchAllClears.add_argument('--useSaved', action='store_true', help="Use saved data")
    parserSearchAllClears.add_argument('--output', type=str, help="Optional: specify output JSON file path")

    args = parser.parse_args()

    # Show help if --help is passed or no command is provided
    if args.help or args.command is None:
        custom_help()
        return
    result = None
    # Handling the logic for each command
    if args.command == 'chart':
        result = searchByChart(args.chart_id, useSaved=args.useSaved)
        #print(str(result).encode('utf-8').decode('utf-8'))
        print("got chart, writing")

    elif args.command == 'player':
        validateSortOption(args.sortBy, CLEAR_SORT_OPTIONS, "player")
        result = searchByPlayer(args.player, TwvKOnly=args.TwvKOnly, showCharts=args.showCharts, useSaved=args.useSaved)
        #print(str(result).encode('utf-8').decode('utf-8'))
        print("got player, writing")

    elif args.command == 'all_players':
        validateSortOption(args.sortBy, PLAYER_SORT_OPTIONS, "all_players")
        result = searchAllPlayers(sortBy=args.sortBy, TwvKOnly=args.TwvKOnly, disableCharts=args.disableCharts,
                                  reverse=args.reverse, useSaved=args.useSaved)
        #print(str(result).encode('utf-8').decode('utf-8'))
        print("got all players, writing")

    elif args.command == 'all_clears':
        validateSortOption(args.sortBy, CLEAR_SORT_OPTIONS, "all_clears")
        result = searchAllClears(sortBy=args.sortBy, TwvKOnly=args.TwvKOnly, minScore=args.minScore,
                                 reverse=args.reverse, useSaved=args.useSaved)
        #print(str(result).encode('utf-8').decode('utf-8'))
        print("got all clears, writing")

    output_file = args.output if args.output else 'output.json'
    if result:
        save_to_json(result, output_file)
        print("saved to", output_file)

if __name__ == "__main__":
    main()