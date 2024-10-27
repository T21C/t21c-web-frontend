import requests
import asyncio
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter





class AsyncRequest:
    def __init__(self, baseUrl, links):
        self.baseUrl = "http://be.t21c.kro.kr/"
        self.links = links
        self.responses = links.copy()
        self.START_TIME = perf_counter()

    def fetch(self, session, link, index):
        print("started ", link)
        with session.get(self.baseUrl + link) as response:
            self.responses[index] = response
            elapsed = perf_counter() - self.START_TIME
            completionTime = "{:5.2f}s".format(elapsed)
            print("{0:<10} {1:>5}".format(link, completionTime))
        return

    async def getDataAsynchronous(self):
        with ThreadPoolExecutor() as executor:
            with requests.Session() as session:
                # Set any session parameters here before calling `fetch`
                loop = asyncio.get_event_loop()
                self.START_TIME = perf_counter()
                tasks = [
                    loop.run_in_executor(
                        executor,
                        self.fetch,
                        *(
                            session, link, index
                        )
                    )
                    for link, index in zip(self.links, range(len(self.links)))
                ]
                for response in await asyncio.gather(*tasks):
                    pass

    def start(self):
        future = asyncio.ensure_future(self.getDataAsynchronous())
        asyncio.get_event_loop().run_until_complete(future)


