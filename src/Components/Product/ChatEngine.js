import { useState, useEffect } from 'react'
import TypeAheadDropDown from '../InputFields/TypeAheadDropdown'

const ChatEngine = ({ partitions }) => {
    const [query, setQuery] = useState('')
    const [queryResults, setQueryResults] = useState([])
    const [currentPartition, setCurrentPartition] = useState('')
    const [partitionStatus, setPartitionStatus] = useState('invalid')

    useEffect(() => {
        partitions.map(p => p.partition_name).filter(name => name === currentPartition).length > 0 
            ? setPartitionStatus('valid') 
            : setPartitionStatus('invalid')
    }, [currentPartition])

    const handleQueryInput = (e) => {
        const textQuery = e.currentTarget.value
        setQuery(textQuery)
    }

    const handlePartitionEnter = name => {
        setCurrentPartition(name)
        partitions.map(p => p.partition_name).filter(name => name === name).length > 0 
            ? setPartitionStatus('valid') 
            : setPartitionStatus('invalid')
    }

    const queryChatEngine = () => {
        const newResults = [...queryResults, query]
        fetch("https://supermind-n396.onrender.com/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'query': query,
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.length > 1) {
                newResults.push(data)
            } else {
                newResults.push(data)
            }
            setQueryResults(newResults)
            console.log({data})
        })
    }

    return (
        <>
            <div style={{ display: 'block', width: '100%' }}>
                {/* Component to select an old partition, or select a new one */}
                <TypeAheadDropDown 
                    items={partitions.map(part => part.partition_name)} 
                    message={'Select a partition'} 
                    onChange={handlePartitionEnter}
                />
                {/* Error message if New Partition is selected, but partition name already exists */}
                {partitionStatus === 'invalid' && <div>{'Please select a valid partition'}</div>}
            </div>
            <div className="mt-3">
                <label className="block text-base mb-2">Enter a query.</label>
                <div className="mt-3 flex">
                    <input placeholder="Enter query" value={query} onChange={e => handleQueryInput(e)} />
                </div>
            </div>
            {partitionStatus === 'valid' && <button className="mt-3" onClick={queryChatEngine}>Chat</button>}
            {queryResults.length > 0 && 
                <div>
                    <div>Results:</div>
                    <div>
                        {queryResults.map((text, i) => {
                            return (
                                <div>{text}</div>
                            )
                        })}
                    </div>
                </div>
            }
        </>
    )
}

export default ChatEngine