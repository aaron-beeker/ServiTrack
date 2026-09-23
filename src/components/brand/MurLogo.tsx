"use client"

import React, { useState } from 'react'

interface MurLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  light?: boolean
}

export function MurLogo({ 
  className = "", 
  size = 'md', 
  showSubtitle = true,
  light = false 
}: MurLogoProps) {
  const [imgError, setImgError] = useState(false)

  const heightClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-11",
    xl: "h-14"
  }

  const iconSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
    xl: "w-14 h-14 text-lg"
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {!imgError ? (
        <div className="flex flex-col">
          <img
            src={light ? "/mur-logo.png" : "/mur-logo-white.png"}
            alt="MUR Tecnología"
            onError={() => setImgError(true)}
            className={`${heightClasses[size]} w-auto object-contain transition-all`}
          />
          {showSubtitle && (
            <span className="text-[9px] font-semibold tracking-widest uppercase text-[#38BDF8] mt-1 pl-0.5">
              Servicio Técnico Especializado • ISO 9001
            </span>
          )}
        </div>
      ) : (
        /* Fallback Vectorial Minimalista */
        <div className="flex items-center gap-3">
          <div className={`${iconSizes[size]} rounded-xl bg-[#2369A1] flex items-center justify-center font-bold text-white shadow-md shadow-[#2369A1]/30 border border-[#38BDF8]/40 shrink-0`}>
            MUR
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className={`font-black tracking-tight ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'} ${light ? 'text-[#0F1E2E]' : 'text-white'}`}>
                MUR
              </span>
              <span className={`font-semibold tracking-normal ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'} text-[#2369A1]`}>
                TECNOLOGÍA
              </span>
            </div>
            {showSubtitle && (
              <span className="text-[9px] font-semibold tracking-widest uppercase text-slate-400 mt-1">
                Servicio Técnico Especializado • ISO 9001
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
