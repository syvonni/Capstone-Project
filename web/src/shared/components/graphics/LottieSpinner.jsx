import { useState, useEffect } from 'react'
import { useLottie } from 'lottie-react'

const LottieSpinner = ({ size = 'default', tip, style }) => {
  const [animationData, setAnimationData] = useState(null)
  
  useEffect(() => {
    fetch('/LogoLottie.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load logo animation:', err))
  }, [])
  
  const options = {
    animationData,
    loop: true,
    autoplay: true,
  }
  
  const { View } = useLottie(options)
  
  const sizeMap = {
    small: 24,
    default: 32,
    large: 48,
  }
  
  const spinnerSize = sizeMap[size] || sizeMap.default
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...style }}>
      <div style={{ width: spinnerSize, height: spinnerSize }}>
        {View}
      </div>
      {tip && <span style={{ fontSize: 14, color: '#999' }}>{tip}</span>}
    </div>
  )
}

export default LottieSpinner
