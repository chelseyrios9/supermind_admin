import { useCallback, useContext, useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, addEdge, useNodesState, useEdgesState } from 'reactflow';
import {XMLParser} from 'fast-xml-parser'
import CustomReactFlowNode from "@/Helper/CustomReactFlowNode";
import CustomReactFlowEdge from "@/Helper/CustomReactFlowEdge";
import Btn from '@/Elements/Buttons/Btn';
import 'reactflow/dist/style.css';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Toast, ToastHeader, ToastBody, Modal, ModalHeader, ModalBody } from "reactstrap";
import { useRef } from 'react';
import { MdClose } from 'react-icons/md';
import AccountContext from './AccountContext';
import CreateTurn from '@/Components/Superpower/ProcedureSuperPower/CreateTurn';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix : "@_",
  processEntities: false,
});

const nodeTypes = {
    customNode: CustomReactFlowNode,
};

const edgeTypes = {
    customEdge: CustomReactFlowEdge,
}

const ReactFlowChart = ({name, procedure, description, vectorQuery, procedureId, width='75vw', height='100vh'}) => {
    const [webSocket, setWebSocket] = useState(null)
    const [refreshWebSocket, setRefreshWebSocket] = useState(0)
    const [stateProcedure, setStateProcedure] = useState(procedure)
    const [stateDescription, setStateDescription] = useState(description)
    const [stateVectorQuery, setStateVectorQuery] = useState(vectorQuery)
    const [stateProcedureId, setStateProcedureId] = useState(procedureId)
    const [chatMessage, setChatMessage] = useState("")
    const [openEditToast, setOpenEditToast] = useState(false);
    const [openParametersToast, setOpenParametersToast] = useState(false);
    const [openModel, setOpenModel] = useState(false);
    const [prompt, setPrompt] = useState(``)
    const [chatLoading, setChatLoading] = useState(false)
    const [chatData, setChatData] = useState([])
    const [chatLogs, setChatLogs] = useState([])
    const [parameters, setParameters] = useState([])
    const [focusSet, setFocusSet] = useState(false)
    const [parameterCursor, setParameterCursor] = useState(null)
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const editRef = useRef()
    const parametersRef = useRef([])
    const {accountData} = useContext(AccountContext);

    const onConnect = useCallback(
        (params) => {
            const connectEdge = async () => {
                const graphEndIndex = stateProcedure.indexOf("</graph>")
                const contentToAdd = `<edge source="${params.source}" target="${params.target}" />\n`
                setStateProcedure(stateProcedure.slice(0, graphEndIndex) + contentToAdd + stateProcedure.slice(graphEndIndex))
                if(!openEditToast) setOpenEditToast(true);
                if(!openParametersToast) setOpenParametersToast(true);
                if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
                if(editRef.current.selectionStart !== graphEndIndex || editRef.current.selectionEnd !== graphEndIndex + contentToAdd.length) {
                    setTimeout(() => {
                        focusOnTextSelection(graphEndIndex, graphEndIndex + contentToAdd.length)
                    }, 10);
                }
                return addEdge({...params, type: "customEdge", label: ""}, edges)
            }
            connectEdge().then((e) => setEdges(e))
            
        },
        [edges],
    );

    const {mutate: updateProcedureMutate, isLoading: updateProcedureLoading} = useMutation(async ({procedure, description, vectorQuery, procedureId}) => {
        const resp = await fetch("https://nodeapi.supermind.bot/nodeapi/saveProcedure", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({procedure, procedureId, name, description, vectorQuery})
        })
        const respJson = await resp.json()
        if(respJson.success) {
            alert(`Procedure ${procedureId ? "updated" : "saved"}`)
            if(!procedureId) setStateProcedureId(respJson.data)
        }
        throw respJson.message
    }, { refetchOnWindowFocus: false });

    const { isLoading: promptsLoading, data: promptsData } = useQuery(["prompts"], async() => {
        const resp = await fetch("https://nodeapi.supermind.bot/nodeapi/getPrompts", {
          method: "GET",
          headers: {
              "Content-Type": "application/json",
          },
        })
        const respJson = await resp.json()
        if(respJson.success) {
          setPrompt(respJson.data.procedure_chat)
          return respJson
        }
        throw respJson.message
    }, { refetchOnWindowFocus: false, refetchOnMount: false, cacheTime: 0, select: (data) => data.data });

    const {mutate: updatePromptsMutate, isLoading: updatePromptsLoading} = useMutation(async () => {
    const resp = await fetch("https://nodeapi.supermind.bot/nodeapi/updatePrompts", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({...promptsData, procedure_chat: prompt})
    })
    const respJson = await resp.json()
    if(respJson.success) {
        alert(`Prompts updated`)
    }
    throw respJson.message
    }, { refetchOnWindowFocus: false });    

    useEffect(() => {
        if(stateProcedure){
            const parsedData = xmlParser.parse(stateProcedure)
            const graphData = parsedData.graph || parsedData.procedure?.graph || parsedData.commandBlock?.graph || parsedData.commandBlock?.command?.graph || parsedData.Command?.graph
            const edgeData = graphData?.edge?.edge || graphData?.edge || graphData?.edges?.edge
            const nodeData = graphData?.node || graphData?.nodes?.node
            const sourceNodeCount = {}
            const targetNodeCount = {}
            const edges = []
            const handleEdgeInclude = (e, i) => {
                if(sourceNodeCount[e["@_source"]]) sourceNodeCount[e["@_source"]]++
                else sourceNodeCount[e["@_source"]] = 1
    
                if(targetNodeCount[e["@_target"]]) targetNodeCount[e["@_target"]]++
                else targetNodeCount[e["@_target"]] = 1
    
                edges.push({id: i, type: "customEdge", source: e["@_source"], sourceHandle: `${sourceNodeCount[e["@_source"]] - 1}`, target: e["@_target"], targetHandle: `${targetNodeCount[e["@_target"]] - 1}`, label: e?.edgeLogic?.condition?.returnValue || e?.edgeLogic?.condition?.returnValueLogic || ""})
            }
            if(Array.isArray(edgeData)){
                for(let i = 0; i < edgeData?.length; i++){
                    const e = edgeData[i]
                    if(typeof e !== "object") continue
                    handleEdgeInclude(e, i)
                }
            } else if (typeof edgeData === "object") {
                handleEdgeInclude(edgeData, 0)
            }
            const nodes = nodeData?.map((n, i) => {
                return {id: n["@_id"], type: "customNode", position: {x: 100 * (i % 2 === 0 ? -1 : 1), y: i * 100}, data: {label: n["#text"] || n["@_id"], sourceHandleCount: sourceNodeCount[n["@_id"]] ?? 1, targetHandleCount: targetNodeCount[n["@_id"]] ?? 1, deleteNode}}
            })
            setNodes([])
            setEdges([])
            setTimeout(() => {
                setNodes(nodes ?? [])
                setEdges(edges ?? [])
            }, 0);
        }
    }, [stateProcedure])

    useEffect(() => {
        const webSocket = new WebSocket("wss://nodeapi.supermind.bot/nodeapi")
        setWebSocket(webSocket);
        webSocket.onmessage = (event) => {
            try {
                const jsonData = JSON.parse(event.data)
                if(jsonData.event === "chatWithProcedureMessage") {
                    setChatData(prev => [...prev, jsonData.data])
                    if(jsonData.isEnd) setChatLoading(false)
                }
                if(jsonData.event === "chatWithProcedureLog") {
                    setChatLogs(prev => [...prev, jsonData.data])
                }
                if(jsonData.event === "chatWithProcedureError") {
                    alert(jsonData.message)
                    setChatLoading(false)
                }
            } catch (e) {
                console.log(e)
            }
        };
    }, [refreshWebSocket])

    const getNodesParameters = (nodeIndex) => {
        const nodesStartIndex = stateProcedure.indexOf("<nodes>")
        const nodeEndStr = "</nodes>"
        const nodesEndIndex = stateProcedure.indexOf(nodeEndStr)
        const parsedData = xmlParser.parse(stateProcedure.slice(nodesStartIndex, nodesEndIndex + nodeEndStr.length))
        const tempParameters = []
        const traverseAllData = (data) => {
            if(Array.isArray(data)){
                for (const d of data) {
                    traverseAllData(d)
                }
            } else {
                for (const [key, value] of Object.entries(data)) {
                    if(typeof value === "object" && key !== "system"){
                        traverseAllData(value)
                    } else if( key === "system") {
                        let newValue = value
                        if(typeof value === "object") newValue = JSON.stringify(value)
                        tempParameters.push({key, value: newValue})
                    } else {
                        let newKey = key.replace("@_", "").replace("#")
                        if(newKey === "key") newKey = `Parameter key`
                        else if(newKey === "value") newKey = `Parameter value`
                        tempParameters.push({key: newKey, value})
                    }
                }
            }
        }
        nodeIndex--
        if(nodeIndex >= 0){
            const selectedNode = parsedData?.nodes?.node?.[nodeIndex]
            if(selectedNode){
                traverseAllData(selectedNode)
                setParameters(tempParameters)
            }
        }
    }

    const focusOnTextSelection = (selectionStart, selectionEnd, shouldFocus=true) => {
        if(shouldFocus) editRef.current.focus()
        const fullText = editRef.current.value;
        editRef.current.value = fullText.substring(0, selectionEnd);
        const scrollHeight = editRef.current.scrollHeight
        editRef.current.value = fullText;
        let scrollTop = scrollHeight;
        const textareaHeight = editRef.current.clientHeight;
        if (scrollTop > textareaHeight){
            scrollTop -= textareaHeight / 2;
        } else{
            scrollTop = 0;
        }
        editRef.current.scrollTop = scrollTop;
        editRef.current.selectionStart = selectionStart
        editRef.current.selectionEnd = selectionEnd
    }

    const handleNodeChange = async (val) => {
        if(val.length === 1 && (val[0].type === "select" || val[0].type === "position")){
            const nodeId = val[0].id

            if(!openEditToast) setOpenEditToast(true);
            if(!openParametersToast) setOpenParametersToast(true);
            if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
            const node = nodes.find((node) => node.id === nodeId)
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if(nodeIndex >= 0) getNodesParameters(nodeIndex)
            if(node) {
                const nodeName = node.id
                const nodesStr = `<nodes>`
                const nodesIndex = editRef.current.value.indexOf(nodesStr) + nodesStr.length
                const nodeIndexDoubleQuotes = editRef.current.value.slice(nodesIndex).indexOf(`<node id="${nodeId}"`)
                const nodeIndexSingleQuotes = editRef.current.value.slice(nodesIndex).indexOf(`<node id='${nodeId}'`)
                const nodeIndex = nodeIndexDoubleQuotes >= 0 ? nodeIndexDoubleQuotes : nodeIndexSingleQuotes
                const editIndex = editRef.current.value.slice(nodesIndex + nodeIndex).indexOf(nodeName)
                focusOnTextSelection(nodesIndex + nodeIndex + editIndex, nodesIndex + nodeIndex + editIndex + nodeName.length)
            }
        }
        onNodesChange(val)
    }

    const handleEdgeChange = async (val) => {
        let filteredVal = val
        if(filteredVal.length > 1) filteredVal = filteredVal.filter((v) => v.selected )
        if(filteredVal.length === 1 && (filteredVal[0].type === "select" || filteredVal[0].type === "position")){
            const edgeId = filteredVal[0].id
            if(!openEditToast) setOpenEditToast(true);
            if(!openParametersToast) setOpenParametersToast(true);
            if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
            const edge = edges.find((edge) => edge.id === edgeId)
            if(edge) {
                const edgeName = edge.label
                const edgeSource = edge.source
                const edgeTarget = edge.target
                const edgeStartDoubleQuotes = `<edge source="${edgeSource}" target="${edgeTarget}"`
                const edgeStartSingleQuotes = `<edge source='${edgeSource}' target='${edgeTarget}'`
                const edgeStartIndexDoubleQuotes = editRef.current.value.indexOf(edgeStartDoubleQuotes)
                const edgeStartIndexSingleQuotes = editRef.current.value.indexOf(edgeStartSingleQuotes)
                const edgeStartIndex = edgeStartIndexDoubleQuotes >= 0 ? edgeStartIndexDoubleQuotes : edgeStartIndexSingleQuotes
                const isSelfClosingDoubleQuotesEdge = editRef.current.value.indexOf(`${edgeStartDoubleQuotes} />`) >= 0
                const isSelfClosingSingleQuotesEdge = editRef.current.value.indexOf(`${edgeStartSingleQuotes} />`) >= 0
                const isSelfClosingEdge = isSelfClosingDoubleQuotesEdge || isSelfClosingSingleQuotesEdge
                const edgeEnd = isSelfClosingEdge ? ` />` : `</edge>`
                const edgeEndIndex = isSelfClosingEdge ? edgeStartDoubleQuotes.length : editRef.current.value.slice(edgeStartIndex).indexOf(edgeEnd)
                const editIndex = editRef.current.value.slice(edgeStartIndex).indexOf(edgeName)
                editRef.current.focus()
                if(edgeName && edgeName.length){
                    let selectionEnd = edgeStartIndex + editIndex + edgeName.length
                    if(editRef.current.selectionEnd === editRef.current.selectionStart) selectionEnd += edgeStartDoubleQuotes.length + 3
                    focusOnTextSelection(edgeStartIndex + editIndex, selectionEnd)
                } else {
                    focusOnTextSelection(edgeStartIndex, edgeStartIndex + edgeEndIndex + edgeEnd.length)
                }
            }
        } else if(filteredVal.length === 1 && filteredVal[0].type === "remove"){
            if(!openEditToast) setOpenEditToast(true);
            if(!openParametersToast) setOpenParametersToast(true);
            if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
            const edgeId = filteredVal[0].id
            const edge = edges.find((edge) => edge.id === edgeId)
            if(edge) {
                const edgeSource = edge.source
                const edgeTarget = edge.target
                const edgeDoubleQuotes = `<edge source="${edgeSource}" target="${edgeTarget}"`
                const edgeSingleQuotes = `<edge source='${edgeSource}' target='${edgeTarget}'`
                const edgeStartIndexDoubleQuotes = editRef.current.value.indexOf(edgeDoubleQuotes)
                const edgeStartIndexSingleQuotes = editRef.current.value.indexOf(edgeSingleQuotes)
                const edgeStartIndex = edgeStartIndexDoubleQuotes >= 0 ? edgeStartIndexDoubleQuotes : edgeStartIndexSingleQuotes
                const isSelfClosingDoubleQuotesEdge = editRef.current.value.indexOf(`${edgeDoubleQuotes} />`) >= 0
                const isSelfClosingSingleQuotesEdge = editRef.current.value.indexOf(`${edgeSingleQuotes} />`) >= 0
                const isSelfClosingEdge = isSelfClosingDoubleQuotesEdge || isSelfClosingSingleQuotesEdge
                const edgeEnd = isSelfClosingEdge ? ` />` : `</edge>`
                const edgeEndIndex = isSelfClosingEdge ? edgeDoubleQuotes.length : editRef.current.value.slice(edgeStartIndex).indexOf(edgeEnd)
                setStateProcedure(stateProcedure.slice(0, edgeStartIndex) + stateProcedure.slice(edgeStartIndex + edgeEndIndex + edgeEnd.length))
                setTimeout(() => {
                    focusOnTextSelection(edgeStartIndex, edgeStartIndex)
                }, 10);
            }
        } else if (val[0].type === "reset") {
            const filteredVal = val.filter(({item}) => item.selected)
            for (const {item} of filteredVal) {
                if(!openEditToast) setOpenEditToast(true);
                if(!openParametersToast) setOpenParametersToast(true);
                if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
                const edgeName = item.label
                const edgeSource = item.source
                const edgeTarget = item.target
                const edgeDoubleQuotes = `<edge source="${edgeSource}" target="${edgeTarget}"`
                const edgeSingleQuotes = `<edge source='${edgeSource}' target='${edgeTarget}'`
                const edgeIndexDoubleQuotes = editRef.current.value.indexOf(edgeDoubleQuotes)
                const edgeIndexSingleQuotes = editRef.current.value.indexOf(edgeSingleQuotes)
                const edgeIndex = edgeIndexDoubleQuotes >= 0 ? edgeIndexDoubleQuotes : edgeIndexSingleQuotes
                const isSelfClosingDoubleQuotesEdge = editRef.current.value.indexOf(`${edgeDoubleQuotes} />`) >= 0
                const isSelfClosingSingleQuotesEdge = editRef.current.value.indexOf(`${edgeSingleQuotes} />`) >= 0
                const isSelfClosingEdge = isSelfClosingDoubleQuotesEdge || isSelfClosingSingleQuotesEdge
                const edgeEnd = isSelfClosingEdge ? ` />` : `</edge>`
                const edgeEndIndex = isSelfClosingEdge ? edgeEnd.length : editRef.current.value.slice(edgeIndex + edgeDoubleQuotes.length).indexOf(edgeEnd) + edgeEnd.length
                const sourceNode = nodes.find((node) => node.id === edgeSource)
                const textToAdd = `>
        <edgeLogic>
            <condition>
            <source>${sourceNode?.data.label}</source>
            <returnValue>${edgeName}</returnValue>
            </condition>
        </edgeLogic>
    </edge>`
                setStateProcedure(editRef.current.value.slice(0, edgeIndex + edgeDoubleQuotes.length) + textToAdd + editRef.current.value.slice(edgeIndex + edgeDoubleQuotes.length + edgeEndIndex))
                setTimeout(() => {
                    const selectionLength = edgeIndex + edgeDoubleQuotes.length + textToAdd.indexOf("</returnValue>")
                    focusOnTextSelection(selectionLength, selectionLength)
                }, 10);
            }
        }
        onEdgesChange(val)
    }

    const toggleEditToast = () => setOpenEditToast((prev) => !prev);

    const toggleParametersToast = () => setOpenParametersToast((prev) => !prev);

    const toggleModal = () => setOpenModel((prev) => !prev);

    const addTurn = async (name, turnToAdd) => {
        if(!openEditToast) setOpenEditToast(true);
        if(!openParametersToast) setOpenParametersToast(true);
        if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
        const lastNode = nodes[nodes.length - 1]
        const lastNodeDoubleQuotes = `<node id="${lastNode.id}">${lastNode.data.label}</node>`
        const lastNodeSingleQuotes = `<node id='${lastNode.id}'>${lastNode.data.label}</node>`
        const lastNodeDoubleQuotesIndex = editRef.current.value.indexOf(lastNodeDoubleQuotes)
        const lastNodeSingleQuotesIndex = editRef.current.value.indexOf(lastNodeSingleQuotes)
        const lastNodeQuotesIndex = (lastNodeDoubleQuotesIndex >= 0 ? lastNodeDoubleQuotesIndex : lastNodeSingleQuotesIndex) + lastNodeDoubleQuotes.length
        const newId = String.fromCharCode(lastNode.id.charCodeAt(0) + 1)
        const nodeToAdd = `
<node id="${newId}">${name}</node>`

        const lastTurnDoubleQuotes = `<turn id="${lastNode.id}">`
        const lastTurnSingleQuotes = `<turn id='${lastNode.id}'>`
        const lastTurnDoubleQuotesIndex = editRef.current.value.indexOf(lastTurnDoubleQuotes)
        const lastTurnSingleQuotesIndex = editRef.current.value.indexOf(lastTurnSingleQuotes)
        const lastTurnQuotesIndex = (lastTurnDoubleQuotesIndex >= 0 ? lastTurnDoubleQuotesIndex : lastTurnSingleQuotesIndex) + lastTurnDoubleQuotes.length
        const turnEnd = `</turn>`
        const turnEndIndex = (editRef.current.value.slice(lastTurnQuotesIndex).indexOf(turnEnd)) + turnEnd.length
        const newDoubleQuotesTurn = "<turn id="
        const newSingleQuotesTurn = "<turn id="
        const newTurnStartIndex = turnToAdd.indexOf(newDoubleQuotesTurn) || turnToAdd.indexOf(newSingleQuotesTurn)
        const newTurnEndIndex = turnToAdd.indexOf(turnEnd) + turnEnd.length
        turnToAdd = turnToAdd.slice(newTurnStartIndex, newTurnStartIndex + newDoubleQuotesTurn.length + 1) + newId + turnToAdd.slice(newTurnStartIndex + newDoubleQuotesTurn.length + 2, newTurnEndIndex)
        setStateProcedure(prev => {
            let tempProcedure = prev
            tempProcedure = tempProcedure.slice(0, lastTurnQuotesIndex + turnEndIndex) + `\n${turnToAdd}` + tempProcedure.slice(lastTurnQuotesIndex + turnEndIndex)
            tempProcedure = tempProcedure.slice(0, lastNodeQuotesIndex) + nodeToAdd + tempProcedure.slice(lastNodeQuotesIndex)
            return tempProcedure
        })
        toggleModal()
        setTimeout(() => {
            focusOnTextSelection(lastTurnQuotesIndex + turnEndIndex + nodeToAdd.length, lastTurnQuotesIndex + turnEndIndex + nodeToAdd.length + turnToAdd.length)
        }, 400);
    }

    const deleteNode = async (nodeId) => {
        if(!openEditToast) setOpenEditToast(true);
        if(!openParametersToast) setOpenParametersToast(true);
        if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
        setStateProcedure(prevStateProcedure => {
            let tempProcedure = prevStateProcedure
            setNodes(prevNodes => {
                const nodeToDelete = prevNodes.find((node) => node.id === nodeId)
                setEdges(prevEdges => {
                    const edgesToDelete = prevEdges.filter((edge) => edge.source === nodeId || edge.target === nodeId)
                    const nodeToDeleteDoubleQuotes = `<node id="${nodeToDelete.id}">${nodeToDelete.data.label}</node>`
                    const nodeToDeleteSingleQuotes = `<node id='${nodeToDelete.id}'>${nodeToDelete.data.label}</node>`
                    const nodeToDeleteDoubleQuotesIndex = tempProcedure.indexOf(nodeToDeleteDoubleQuotes)
                    const nodeToDeleteSingleQuotesIndex = tempProcedure.indexOf(nodeToDeleteSingleQuotes)
                    const nodeToDeleteQuotesIndex = (nodeToDeleteDoubleQuotesIndex >= 0 ? nodeToDeleteDoubleQuotesIndex : nodeToDeleteSingleQuotesIndex)
        
                    const turnToDeleteDoubleQuotes = `<turn id="${nodeToDelete.id}">`
                    const turnToDeleteSingleQuotes = `<turn id='${nodeToDelete.id}'>`
                    const turnToDeleteDoubleQuotesIndex = tempProcedure.indexOf(turnToDeleteDoubleQuotes)
                    const turnToDeleteSingleQuotesIndex = tempProcedure.indexOf(turnToDeleteSingleQuotes)
                    const turnToDeleteQuotesIndex = (turnToDeleteDoubleQuotesIndex >= 0 ? turnToDeleteDoubleQuotesIndex : turnToDeleteSingleQuotesIndex)
                    const turnEnd = `</turn>`
                    const turnEndIndex = (tempProcedure.slice(turnToDeleteQuotesIndex + turnToDeleteDoubleQuotes.length).indexOf(turnEnd)) + turnEnd.length
                    
                    tempProcedure = tempProcedure.slice(0, turnToDeleteQuotesIndex) + tempProcedure.slice(turnToDeleteQuotesIndex + turnToDeleteDoubleQuotes.length + turnEndIndex)
                    edgesToDelete.forEach((edge) => {
                        const edgeSource = edge.source
                        const edgeTarget = edge.target
                        const edgeDoubleQuotes = `<edge source="${edgeSource}" target="${edgeTarget}"`
                        const edgeSingleQuotes = `<edge source='${edgeSource}' target='${edgeTarget}'`
                        const edgeStartIndexDoubleQuotes = tempProcedure.indexOf(edgeDoubleQuotes)
                        const edgeStartIndexSingleQuotes = tempProcedure.indexOf(edgeSingleQuotes)
                        const edgeStartIndex = edgeStartIndexDoubleQuotes >= 0 ? edgeStartIndexDoubleQuotes : edgeStartIndexSingleQuotes
                        const isSelfClosingDoubleQuotesEdge = tempProcedure.indexOf(`${edgeDoubleQuotes} />`) >= 0
                        const isSelfClosingSingleQuotesEdge = tempProcedure.indexOf(`${edgeSingleQuotes} />`) >= 0
                        const isSelfClosingEdge = isSelfClosingDoubleQuotesEdge || isSelfClosingSingleQuotesEdge
                        const edgeEnd = isSelfClosingEdge ? ` />` : `</edge>`
                        const edgeEndIndex = isSelfClosingEdge ? edgeDoubleQuotes.length : editRef.current.value.slice(edgeStartIndex).indexOf(edgeEnd)
                        tempProcedure = tempProcedure.slice(0, edgeStartIndex) + tempProcedure.slice(edgeStartIndex + edgeEndIndex + edgeEnd.length)
                    })
                    tempProcedure = tempProcedure.slice(0, nodeToDeleteQuotesIndex) + tempProcedure.slice(nodeToDeleteQuotesIndex + nodeToDeleteDoubleQuotes.length)
                    return prevEdges
                })
                return prevNodes
            })
            return tempProcedure
        })
    }

    const updateProcedure = () => updateProcedureMutate({procedure: stateProcedure, description: stateDescription, vectorQuery: stateVectorQuery, procedureId: stateProcedureId})

    const handleParametersFocus = async (newKey, value) => {
        let keyIndexOffset = value.length
        if(newKey === "Parameter key") newKey = `<key>${value}`
        else if(newKey === "Parameter value") newKey = `<value>${value}`
        else if(newKey === "system") newKey = `<system message>${value}`
        else newKey = `<${newKey}>${value}`
        if(!openEditToast) setOpenEditToast(true);
        const nodesStartIndex = stateProcedure.indexOf("<nodes>")
        const keyIndex = stateProcedure.slice(nodesStartIndex).indexOf(newKey) - keyIndexOffset
        const valIndex = stateProcedure.slice(nodesStartIndex + keyIndex + newKey.length).indexOf(value)
        if(!editRef.current) await new Promise((res) => setTimeout(res, 200))
        return [nodesStartIndex + keyIndex + newKey.length + valIndex, nodesStartIndex + keyIndex + newKey.length + valIndex + value.length]
    }

    return <>
        <div>
            <h3>Description:</h3>
            <textarea style={{width: "100%"}} rows="10" type="text" value={stateDescription} onChange={(e) => setStateDescription(e.target.value)} />
        </div>
        <div>
            <h3>Vector Query:</h3>
            <textarea style={{width: "100%"}} rows="10" type="text" value={stateVectorQuery} onChange={(e) => setStateVectorQuery(e.target.value)} />
        </div>
        <div>
            <h3>Procedure:</h3>
            <textarea style={{width: "100%"}} rows="10" type="text" value={stateProcedure} onChange={(e) => setStateProcedure(e.target.value)} />
            <Btn
                title="Update Procedure"
                className="align-items-center btn-theme add-button"
                loading={updateProcedureLoading}
                onClick={updateProcedure}
            />
        </div>
        <div style={{marginBottom: "10px"}}>
            <h3>Chat With Procedure:</h3>
            <div style={{display: "flex", gap: 10, justifyContent: "space-around", alignItems: "center"}}>
                <textarea style={{flex: 2}} placeholder='User Message' rows={5} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} />
                {accountData?.system_reserve === 1 && <textarea style={{flex: 2}} placeholder='Prompt' rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />}
                {accountData?.system_reserve === 1 && <Btn
                    title="Update Prompts"
                    className="align-items-center btn-theme add-button"
                    loading={chatLoading || updatePromptsLoading || promptsLoading}
                    onClick={updatePromptsMutate}
                />}
                <Btn
                    title="Chat With Procedure"
                    className="align-items-center btn-theme add-button"
                    loading={chatLoading}
                    onClick={() => {
                        if(webSocket.readyState === webSocket.CLOSED) {
                            setRefreshWebSocket(prev => prev ? 0 : 1)
                            alert("Error occured. Please try again")
                            return
                        }
                        webSocket.send(JSON.stringify({event: "chatWithProcedure", data: {procedure: `${description}\n${stateProcedure}`, message: chatMessage, prompt, userId: accountData.id}}))
                        setChatLoading(true)
                        setChatData([])
                        setChatLogs([])
                    }}
                />
            </div>
            {chatLogs.length > 0 && <div>
                <h3>Logs: </h3>
                {chatLogs.map((chatLog, i) => <p key={i}>{chatLog}</p>)}
            </div>}
           {chatData.length > 0 && <div>
                <h3>Response: </h3>
                <p>{chatData.map((data, i) => <p key={i}>{data}</p>)}</p>
            </div>}
        </div>
        <div style={{ width, height, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={handleNodeChange} onEdgesChange={handleEdgeChange} onConnect={onConnect} fitView >
                <Controls />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
            <Toast style={{width: "500px"}} isOpen={openEditToast}>
                <ToastHeader close={<div style={{cursor:"pointer"}} onClick={toggleEditToast}>
                    {MdClose()}
                </div>} toggle={toggleEditToast}>Edit</ToastHeader>
                <ToastBody>
                    <textarea ref={editRef} rows="20" style={{"width": "100%"}} type="text" value={stateProcedure} onChange={(e) => setStateProcedure(e.target.value)} />
                </ToastBody>
            </Toast>
            <Toast style={{width: "500px", overflowY: "scroll"}} isOpen={openParametersToast}>
                <ToastHeader close={<div style={{cursor:"pointer"}} onClick={toggleParametersToast}>
                    {MdClose()}
                </div>} toggle={toggleParametersToast}>Parameters</ToastHeader>
                <ToastBody>
                    {
                        parameters?.map((p, i) => {
                            return <div style={{display: "flex", flexDirection: "column", marginBottom: "5px"}} key={i}>
                                <label>{p.key}</label>
                                <input style={{outline: "solid"}} ref={el => parametersRef.current[i] = el} type="text" value={p.value} 
                                onFocus={async() => {
                                    if(!focusSet){
                                        const [selectionStart, selectionEnd] = await handleParametersFocus(p.key, p.value)
                                        focusOnTextSelection(selectionStart, selectionEnd, false)
                                        parametersRef.current[i].focus()
                                        setFocusSet(true)
                                        setTimeout(() => {
                                            setFocusSet(false)
                                        }, 100);
                                    }
                                    
                                }}
                                onChange={async(e) => {
                                    const newValue = e.currentTarget.value
                                    const cursorPosition = e.currentTarget.selectionStart
                                    const [selectionStart, selectionEnd] = await handleParametersFocus(p.key, p.value)
                                    const tempParameters = [...parameters]
                                    tempParameters[i].value = newValue
                                    setParameters(tempParameters)
                                    setParameterCursor(cursorPosition)
                                    setStateProcedure(prev => {
                                        return prev.slice(0, selectionStart) + newValue + prev.slice(selectionEnd)
                                    })
                                    setTimeout(() => {
                                        setParameterCursor(prev => {
                                            parametersRef.current[i].setSelectionRange(prev, prev)
                                            return prev
                                        })
                                    }, 1);
                                }} 
                                onBlur={() => setParameterCursor(null)}
                                />
                            </div>
                        })
                    }
                </ToastBody>
            </Toast>
        </div>
        <div style={{display:"flex", gap: 5, marginBottom: "20px", marginTop: "20px"}}>
            <Btn
                title="Add New Turn"
                className="align-items-center btn-theme add-button"
                onClick={toggleModal}
            />
            <Btn
                title="Save Changes"
                className="align-items-center"
                loading={updateProcedureLoading}
                onClick={updateProcedure}
            />
        </div>
        <Modal fullscreen isOpen={openModel} toggle={toggleModal}>
            <ModalHeader toggle={toggleModal}>Create New Turn</ModalHeader>
            <ModalBody>
                <CreateTurn procedure={stateProcedure} addTurn={addTurn} />
            </ModalBody>
      </Modal>
    </> 
}

export default ReactFlowChart