import axios from "axios"
import { useEffect, useState } from "react"



const useLevelSearch = (query, sort, pageNumber) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [level, setLevel] = useState([])
    const [hasMore, setHasmore] = useState(false)

    useEffect(()=>{
        setLevel([])
    }, [query, sort])
    useEffect(()=>{
        setLoading(true)
        setError(false)
        let cancel
        axios({
            method: 'get',
            url: `${import.meta.env.VITE_OFFSET_LEVEL}`,
            params: {query: query, sort:sort  ,offset: pageNumber * 10},
            cancelToken: new axios.CancelToken(c => cancel = c)
        }).then(res => {

            setLevel(prevLevel =>  {
                return [...new Set ( [...prevLevel, ...res.data.results.map(l => l.creator)] )] //if want to change remove set
            })
            setHasmore(res.data.count > 0)
            setLoading(false)
            
            console.log(res.data)
        }).catch(e => {
            if (axios.isCancel(e)) return
            setError(true)
        })
        return () => cancel()
    },[query, sort ,pageNumber])


  return {loading, error, level, hasMore}
}

export default useLevelSearch