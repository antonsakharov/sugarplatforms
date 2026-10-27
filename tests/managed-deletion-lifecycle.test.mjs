import test from "node:test";
import assert from "node:assert/strict";
import { requestManagedAssessmentDeletion } from "../lib/managed-deletion-executor.ts";

const scope={organizationId:"org-a",workspaceId:"ws-a"};
const base={operationId:"11111111-1111-4111-8111-111111111111",organizationId:"org-a",workspaceId:"ws-a",assessmentId:"assessment-a",actorUserId:"admin-a",status:"queued",storageKeys:["org-a/ws-a/assessment-a/a","org-a/ws-a/assessment-a/b"],deletedStorageKeys:[],attemptCount:0,maxAttempts:3,nextAttemptAt:null,leaseExpiresAt:null,lastError:null,receipt:null,createdAt:"2026-10-01T00:00:00.000Z",updatedAt:"2026-10-01T00:00:00.000Z"};

test("managed deletion checkpoints all private objects before relational finalization",async()=>{
 const calls=[]; let job={...base};
 const operations={
  findActive:async()=>null, listDue:async()=>[], prepare:async()=>{calls.push("prepare");return job;},
  startAttempt:async()=>{calls.push("start");job={...job,status:"running",attemptCount:1};return job;},
  checkpointObject:async(_s,_o,key)=>{calls.push(`checkpoint:${key}`);job={...job,deletedStorageKeys:[...job.deletedStorageKeys,key]};return job;},
  recordFailure:async()=>job,
  finalize:async()=>{calls.push("finalize");assert.equal(job.deletedStorageKeys.length,2);return {operationId:job.operationId,assessmentId:job.assessmentId,deletedArtifactObjects:2,deletedRows:{assessments:1},completedAt:"2026-10-01T00:01:00.000Z",auditEventId:"22222222-2222-4222-8222-222222222222"};},
  complete:async(_s,_o,receipt)=>{calls.push("complete");job={...job,status:"completed",receipt};return job;}
 };
 const storage={put:async()=>{throw new Error("unused")},get:async()=>new Uint8Array(),createSignedReadUrl:async()=>null,delete:async(_s,key)=>calls.push(`delete:${key}`)};
 const receipt=await requestManagedAssessmentDeletion({operations,storage,scope,assessmentId:"assessment-a",actorUserId:"admin-a"});
 assert.equal(receipt.deletedArtifactObjects,2);
 assert.deepEqual(calls,["prepare","start","delete:org-a/ws-a/assessment-a/a","checkpoint:org-a/ws-a/assessment-a/a","delete:org-a/ws-a/assessment-a/b","checkpoint:org-a/ws-a/assessment-a/b","finalize","complete"]);
});

test("managed deletion fails closed before finalization when object deletion fails",async()=>{
 let finalized=false,failed=false;
 const operations={findActive:async()=>base,listDue:async()=>[],prepare:async()=>base,startAttempt:async()=>({...base,status:"running",attemptCount:1}),checkpointObject:async()=>{throw new Error("should not checkpoint")},recordFailure:async()=>{failed=true;return base},finalize:async()=>{finalized=true;throw new Error("must not finalize")},complete:async()=>base};
 const storage={put:async()=>{throw new Error("unused")},get:async()=>new Uint8Array(),createSignedReadUrl:async()=>null,delete:async()=>{throw new Error("storage unavailable")}};
 await assert.rejects(()=>requestManagedAssessmentDeletion({operations,storage,scope,assessmentId:"assessment-a",actorUserId:"admin-a"}),/storage unavailable/);
 assert.equal(failed,true); assert.equal(finalized,false);
});
