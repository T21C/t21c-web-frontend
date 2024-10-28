from Core import *
import os, sys
from io import StringIO
from datetime import datetime
from time import perf_counter

chartPathDef = "charts.json"
passPathDef = "passes.json"
playerPathDef = "player.json"
useSavedDef = 1

# uses custom-made result objects defined within Core.py
# those have getitem and behave like a dictionary
# call .get() to pull the dict formatted data from it
# named with PascalCase instead of camelCase

def initData(chartPath, passPath, playerPath, useSaved):
    if chartPath and passPath and playerPath and useSaved:
        if os.path.exists(chartPath) and os.path.exists(passPath) and os.path.exists(playerPath):
            print("using saved...")
            return DataScraper(chartPath, passPath, playerPath)
        else:
            return DataScraper(chartPathDef, passPathDef, playerPathDef, True)
    else:
        return DataScraper(chartPathDef, passPathDef, playerPathDef, True)


def searchByChart(chartId: int, chartPath=chartPathDef, passPath=passPathDef, playerPath=playerPathDef, useSaved=useSavedDef, data=None, getDates=False) \
        -> (list, list):
    util = Utils()
    directCall = False
    if data is None:
        directCall = True
        data = initData(chartPath, passPath, playerPath, useSaved)

    idOffset = 0
    initChartId = chartId
    if chartId >= data.chartsCount:
        chartId = data.chartsCount-1
    if chartId <= 0:
        chartId = 1
    chart = data.charts[chartId-idOffset]
    while chart["id"] > chartId:
        idOffset += 1
        try:
            chart = data.charts[chartId-idOffset]
        except:
            print("Chart ID not found!")
            return []
    validPasses = [Pass for Pass in data.passes
                   if Pass["levelId"] == initChartId]
    if not validPasses:
        return []
    Scores = []
    for Pass in validPasses:
        try:
            date = datetime.strptime(Pass["vidUploadTime"].split("Z")[0], "%Y-%m-%dT%H:%M:%S")
        except:
            date = datetime.today()
        if not Pass["speed"]:
            speed = 1.0
        else:
            speed = Pass["speed"]
        Scores.append(ResultObj().updateParams({
                            "player": Pass["player"],
                            "song": chart["song"],
                            "artist": chart["artist"],
                            "score": util.getScoreV2(Pass, chart),
                            "pguDiff": chart["pguDiff"],
                            "Xacc": util.getXacc(Pass["judgements"]),
                            "speed": speed,
                            "isWorldsFirst": False,
                            "vidLink": Pass["vidLink"],
                            "date": date,
                            "is12K": Pass["is12K"],
                            "isNoHold": Pass["isNoHoldTap"],
                            "judgements": Pass["judgements"],
                            "pdnDiff": chart["pdnDiff"],
                            "chartId": chart["id"],
                            "passId": Pass["id"],
                       }))
    Scores = list(reversed(sorted(Scores, key=lambda x: (x["score"]))))
    datedScores = sorted(Scores, key=lambda x: (x["date"]))
    datedScores[0]["isWorldsFirst"] = True
    if getDates:
        return datedScores
    usedNames = []
    validScores = []
    for score in Scores:
        if score["player"] not in usedNames:
            validScores.append(score.get())
            usedNames.append(score['player'])


    return validScores







def searchByPlayer(playerName: str, chartPath=chartPathDef , passPath=passPathDef, playerPath=playerPathDef, useSaved=useSavedDef, data=None, TwvKOnly=False, ppOnly=False, showCharts=True) \
        -> dict:
    util = Utils()
    directCall = False
    if data is None:
        directCall = True
        data = initData(chartPath, passPath, playerPath, useSaved)

    if playerName not in data.players.keys():
        print("Player not found!")
        return {}
    if data.players[playerName]["isBanned"]:
        print("Player is banned!")
        return {}

    playerPasses = []
    for Pass in data.passes:
        if Pass["player"] == playerName:
            playerPasses.append(Pass)

    Scores = []
    uPasses = 0
    firstPasses = 0
    XaccList = []
    topDiff = ["P", 1]
    top12kDiff = ["P", 1]
    for Pass in playerPasses:
        chartId = Pass["levelId"]
        prevIdTemp = -9999
        prevId = -9999
        if not chartId:
            continue
        chartPos = chartId
        idOffset = 0
        if chartId >= data.chartsCount:
            chart = data.charts[-1]
            chartPos = data.chartsCount - 1
        else:
            chart = data.charts[chartPos + idOffset]
        badFlag = False
        while 1:
            if chart["id"] == prevId:
                badFlag = True
                break
            if chart["id"] == chartId:
                break
            elif chart["id"] < chartId:
                idOffset += 1
            else:
                idOffset -= 1
            prevId = prevIdTemp
            prevIdTemp = chart["id"]
            chart = data.charts[chartPos + idOffset]
        if badFlag:
            continue
        isWorldsFirst = checkWorldsFirst(Pass, data)
        if isWorldsFirst:
            firstPasses += 1
        try:
            date = datetime.strptime(Pass["vidUploadTime"].split("Z")[0], "%Y-%m-%dT%H:%M:%S")
        except:
            date = datetime(2022, 1, 1) #placeholder time
        if not Pass["speed"]:
            speed = 1.0
        else:
            speed = Pass["speed"]
        Scores.append(ResultObj().updateParams({
                            "player": Pass["player"],
                            "song": chart["song"],
                            "artist": chart["artist"],
                            "score": util.getScoreV2(Pass, chart),
                            "pguDiff": chart["pguDiff"],
                            "Xacc": util.getXacc(Pass["judgements"]),
                            "speed": speed,
                            "isWorldsFirst": isWorldsFirst,
                            "vidLink": Pass["vidLink"],
                            "date": date,
                            "is12K": Pass["is12K"],
                            "isNoHold": Pass["isNoHoldTap"],
                            "judgements": Pass["judgements"],
                            "pdnDiff": chart["pdnDiff"],
                            "chartId": chart["id"],
                            "passId": Pass["id"],
                            "baseScore": chart["baseScore"]
                       }))
        try:

            pgu = chart["pguDiff"][0]
            num = int(chart["pguDiff"][1:])
            if data.pguSort[topDiff[0]] < data.pguSort[pgu]:
                topDiff[0] = pgu
                topDiff[1] = num
            if data.pguSort[top12kDiff[0]] < data.pguSort[pgu] and Pass["is12K"]:
                top12kDiff[0] = pgu
                top12kDiff[1] = num

            if data.pguSort[topDiff[0]] == data.pguSort[pgu] and int(topDiff[1]) < num:
                topDiff[1] = num
            if data.pguSort[top12kDiff[0]] == data.pguSort[pgu] and int(top12kDiff[1]) < num and Pass["is12K"]:
                top12kDiff[1] = num
        except:
            pass

    Scores = list(reversed(sorted(Scores, key=lambda x: x["score"])))
    usedIds = []
    validScores = []
    for Score in Scores:
        if Score["chartId"] not in usedIds and (not TwvKOnly or Score["is12K"]):
            validScores.append(Score)
            if Score["pguDiff"][0] == "U":
                uPasses += 1
            usedIds.append(Score["chartId"])
            XaccList.append(Score["Xacc"])


    rankedScore = util.getRankedScore([Score["score"] for Score in validScores])
    general,ppScore,wfScore,tvwKScore = util.calculateScores(validScores)
    topDiff = topDiff[0]+str(topDiff[1])
    top12kDiff = top12kDiff[0]+str(top12kDiff[1])

    scoresNew = []
    for Score in validScores:
        scoresNew.append(Score.get())
    if XaccList:
        avgAcc = sum(XaccList[:20])/len(XaccList[:20])
    else:
        avgAcc = 0
    Player = PlayerObj().updateParams({
            "player":playerName,
            "rankedScore":rankedScore,
            "generalScore": general,
            "ppScore": ppScore,
            "wfScore": wfScore,
            "12kScore": tvwKScore,
            "avgXacc": avgAcc,
            "totalPasses": len(validScores),
            "universalPasses": uPasses,
            "WFPasses": firstPasses,
            "topDiff": topDiff,
            "top12kDiff": top12kDiff,
            "country": data.players[playerName]["country"]})
    if showCharts:
        Player.addScores(scoresNew)
    return Player.get()


WFLookup = {}
def checkWorldsFirst(Pass, data):
    level_id = Pass["levelId"]

    if level_id not in WFLookup:
        WFLookup[level_id] = searchByChart(level_id, data=data, getDates=True)
    passes = WFLookup[level_id]

    for p in passes:
        if p["isWorldsFirst"] and p["passId"] == Pass["id"]:
            return True
    return False


def searchAllPlayers(chartPath=chartPathDef , passPath=passPathDef, playerPath=playerPathDef, useSaved=useSavedDef, sortBy="rankedScore", data=None, disableCharts=True, TwvKOnly=False, reverse=False):
    util = Utils()
    directCall = False
    if data is None:
        directCall = True
        data = initData(chartPath, passPath, playerPath, useSaved)

    playerNameList = data.players.keys()
    playerLeaderboard = []
    i = 0
    n = len(playerNameList)
    print("Players checked:")
    for player in playerNameList:
        i += 1
        print("\r",round(i / n * 100,3), "%          ", end="", flush=True)
        if data.players[player]["isBanned"]:
            continue
        search = searchByPlayer(player, chartPath, passPath, playerPath,True, data, TwvKOnly)
        if search["avgXacc"]:
            playerLeaderboard.append(search)
            if disableCharts:
                 playerLeaderboard[-1]["allScores"] = ""
    print("\n")
    priority = util.allPassSortPriority.copy()
    priority.remove(sortBy)
    sortCriteria = [sortBy] + priority
    if reverse:
        return list(reversed(sorted(playerLeaderboard, key=lambda x: [x[criteria] for criteria in sortCriteria])))
    return sorted(playerLeaderboard, key=lambda x: [x[criteria] for criteria in sortCriteria])


def searchAllClears(chartPath=chartPathDef , passPath=passPathDef, playerPath=playerPathDef, useSaved=useSavedDef, sortBy="score", data=None, minScore=0, TwvKOnly=False, reverse=False):
    util = Utils()
    directCall = False
    if data is None:
        directCall = True
        data = initData(chartPath, passPath, playerPath, useSaved)

    leaderboard = list(searchAllPlayers(data=data, disableCharts=False))
    Clears = []
    i = 0
    n = len(leaderboard)
    print("Players checked:")
    for player in leaderboard:
        i += 1
        print("\r",round(i / n * 100,3), "%                   ", end="", flush=True)
        if data.players[player['player']]["isBanned"]:
            continue
        allClears = player["allScores"]
        for clear in allClears:
            if clear["score"] >= minScore and (not TwvKOnly or clear["is12K"]):
                Result = ResultObj().updateParams({"player": player["player"]})
                Result.updateParams(clear)
                Clears.append(Result)
    priority = util.allClearSortPriority.copy()
    priority.remove(sortBy)
    sortCriteria = [sortBy] + priority
    if reverse:
        return [Item.get() for Item in reversed(sorted(Clears, key=lambda x: [x[criteria] for criteria in sortCriteria]))]
    return [Item.get() for Item in sorted(Clears, key=lambda x: [x[criteria] for criteria in sortCriteria])]

if __name__ == "__main__":
    st = perf_counter()
    [print(n) for n in searchAllPlayers(useSaved=0)]
    print(perf_counter()-st, " s")