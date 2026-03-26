"use client";

import React, { useState, useEffect, useCallback } from 'react';

export interface HallLayoutData {
  _id?: string;
  hall_name: string;
  total_rows: number;
  seats_per_row: number;
  aisle_after_seat: number[];
  reserved_rows: string[];
  stage_position: 'front' | 'back';
  entry_points: 'left' | 'right' | 'both';
}

export interface SeatStatus {
  seatId: string;
  userId: string;
  status: 'temp_hold' | 'confirmed';
  expiresAt: string | null;
}

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function getRowLabel(i: number) {
  if (i < 26) return ROW_LETTERS[i];
  return ROW_LETTERS[Math.floor(i / 26) - 1] + ROW_LETTERS[i % 26];
}

interface Props {
  layout: HallLayoutData;
  compact?: boolean;
  interactive?: boolean;
  eventId?: string;
  currentUserId?: string;
  seatStatuses?: SeatStatus[];
  onSeatClick?: (seatId: string) => void;
  mySeatId?: string | null;
}

export default function VenueMap({
  layout, compact = false, interactive = false,
  currentUserId, seatStatuses = [], onSeatClick, mySeatId,
}: Props) {
  const {
    total_rows, seats_per_row, aisle_after_seat,
    reserved_rows, stage_position, entry_points,
  } = layout;

  const reservedSet = new Set(reserved_rows.map(r => r.toUpperCase()));
  const aisleSet   = new Set(aisle_after_seat.map(Number));
  const seatMap    = new Map(seatStatuses.map(s => [s.seatId, s]));

  const getSeatStyle = (rowLabel: string, seatNum: number, isVip: boolean) => {
    const seatId = `${rowLabel}${seatNum}`;
    const booking = seatMap.get(seatId);
    const isMyHold = mySeatId === seatId;

    if (isMyHold) return {
      bg: '#FEF3C7', border: '#F59E0B', color: '#92400E', cursor: 'pointer', pulse: true,
    };
    if (booking?.status === 'confirmed') return {
      bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', cursor: 'not-allowed', pulse: false,
    };
    if (booking?.status === 'temp_hold') return {
      bg: '#FED7AA', border: '#F97316', color: '#9A3412', cursor: 'not-allowed', pulse: false,
    };
    if (isVip) return {
      bg: 'rgba(232,131,26,0.15)', border: '#E8831A', color: '#E8831A', cursor: interactive ? 'pointer' : 'default', pulse: false,
    };
    return {
      bg: '#F5F5F0', border: '#D1D5DB', color: '#9CA3AF', cursor: interactive ? 'pointer' : 'default', pulse: false,
    };
  };

  const canClick = (rowLabel: string, seatNum: number) => {
    if (!interactive) return false;
    const seatId = `${rowLabel}${seatNum}`;
    const booking = seatMap.get(seatId);
    if (!booking) return true;
    if (booking.status === 'temp_hold' && booking.userId === currentUserId) return true;
    return false;
  };

  const seatSize = compact ? 16 : 20;
  const textSize = compact ? '6px' : '7px';
  const gap = compact ? 2 : 2;

  const StageBar = () => (
    <div className="flex items-center justify-center w-full my-3">
      <div className="flex-1 h-px bg-gray-200"/>
      <div className="px-6 py-2 rounded-lg mx-3 text-xs font-extrabold tracking-widest uppercase"
        style={{ background: '#E8831A', color: '#fff' }}>⬛ STAGE</div>
      <div className="flex-1 h-px bg-gray-200"/>
    </div>
  );

  const EntryExitRow = () => (
    <div className="flex items-center justify-between w-full mt-2 px-2">
      {(entry_points === 'left' || entry_points === 'both') ? (
        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg> Entry
        </div>
      ) : <div/>}
      {(entry_points === 'right' || entry_points === 'both') ? (
        <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase tracking-widest">
          Exit <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
          </svg>
        </div>
      ) : <div/>}
    </div>
  );

  const SeatGrid = () => (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col min-w-max" style={{ gap }}>
        {Array.from({ length: total_rows }, (_, ri) => {
          const rowLabel = getRowLabel(ri);
          const isVip = reservedSet.has(rowLabel);
          return (
            <div key={rowLabel} className="flex items-center" style={{ gap }}>
              {/* Row label left */}
              <div className="w-8 shrink-0 flex items-center justify-end gap-1 pr-1">
                <span className="text-[10px] font-bold text-gray-400">{rowLabel}</span>
                {isVip && <span className="text-[7px] font-extrabold px-1 rounded" style={{ background: '#E8831A', color: '#fff' }}>VIP</span>}
              </div>
              {/* Seats */}
              {Array.from({ length: seats_per_row }, (_, si) => {
                const seatNum = si + 1;
                const seatId = `${rowLabel}${seatNum}`;
                const style = getSeatStyle(rowLabel, seatNum, isVip);
                const clickable = canClick(rowLabel, seatNum);
                return (
                  <React.Fragment key={si}>
                    <div
                      title={seatId}
                      onClick={() => clickable && onSeatClick?.(seatId)}
                      className={`rounded-sm flex items-center justify-center font-bold border transition-all select-none ${style.pulse ? 'animate-pulse' : ''} ${clickable ? 'hover:scale-110 hover:shadow-sm' : ''}`}
                      style={{
                        width: seatSize, height: seatSize,
                        background: style.bg, borderColor: style.border,
                        color: style.color, cursor: style.cursor,
                        fontSize: textSize,
                      }}>
                      {!compact && seatNum}
                    </div>
                    {aisleSet.has(seatNum) && <div style={{ width: compact ? 10 : 14 }} className="shrink-0"/>}
                  </React.Fragment>
                );
              })}
              {/* Row label right */}
              <div className="w-5 shrink-0 pl-1">
                <span className="text-[10px] font-bold text-gray-400">{rowLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-sm bg-[#F5F5F0] border border-gray-200"/> Available</div>
        {interactive && <>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-sm border-2 border-amber-400 bg-amber-50"/> My Hold</div>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-sm border border-orange-400 bg-orange-100"/> Held</div>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-sm border border-red-400 bg-red-100"/> Booked</div>
        </>}
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-sm border border-[#E8831A]" style={{background:'rgba(232,131,26,0.15)'}}/> VIP</div>
      </div>

      {stage_position === 'front' && <StageBar/>}
      {stage_position === 'back' && <EntryExitRow/>}

      <div className="flex justify-center mt-2">
        <SeatGrid/>
      </div>

      {stage_position === 'back' && <StageBar/>}
      {stage_position === 'front' && <EntryExitRow/>}
    </div>
  );
}
