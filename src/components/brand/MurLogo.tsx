"use client"

import React, { useState } from 'react'

interface MurLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  darkBackground?: boolean
}

export function MurLogo({ 
  className = "", 
  size = 'md', 
  showSubtitle = true,
  darkBackground = false 
}: MurLogoProps) {
  const [imgError, setImgError] = useState(false)

  const heightClasses = {
    sm: "h-7",
    md: "h-8",
    lg: "h-10",
    xl: "h-12"
  }

  const iconSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-12 h-12 text-lg"
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {!imgError ? (
        <div className="flex flex-col">
          <img
            src={darkBackground ? "/mur-logo-white.png" : "/mur-logo.png"}
            alt="MUR Tecnología"
            onError={() => setImgError(true)}
            className={`${heightClasses[size]} w-auto object-contain transition-all`}
          />
          {showSubtitle && (
            <span className={`text-[10px] font-medium tracking-wider uppercase mt-1 pl-0.5 ${darkBackground ? 'text-slate-400' : 'text-slate-500'}`}>
              Soporte Técnico Especializado
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className={`${iconSizes[size]} rounded-lg bg-[#2369A1] flex items-center justify-center font-bold text-white shadow-xs shrink-0`}>
            M
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold tracking-tight ${size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'} ${darkBackground ? 'text-white' : 'text-slate-900'}`}>
                MUR
              </span>
              <span className={`font-medium tracking-normal ${size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'} text-[#2369A1]`}>
                TECNOLOGÍA
              </span>
            </div>
            {showSubtitle && (
              <span className={`text-[10px] font-medium tracking-wider uppercase mt-0.5 ${darkBackground ? 'text-slate-400' : 'text-slate-500'}`}>
                Soporte Técnico Especializado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
