import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import React from "react";


export default function CardFrame({Features, header, decor} ) {

    const styling = () => {
        let css = "relative flex flex-col w-[276px] h-[247px] pt-[49px] pb-[26px] px-0 bg-[#424242] rounded-[35px] border-none"
        if(decor){
            css = "relative flex flex-col w-[443px] h-[247px] pt-[49px] pb-[26px] px-0 bg-[#424242] rounded-[35px] border-none"
        }
        return css
    }

    const styling2 = () => {
        let css = "text-left w-[276px] font-h2 text-[length:var(--h2-font-size)] text-[#00ffe9] tracking-[var(--h2-letter-spacing)] leading-[var(--h2-line-height)] [font-style:var(--h2-font-style)]"
        if(decor){
            css = "text-left w-[443px] font-h2 text-[length:var(--h2-font-size)] text-[#00ffe9] tracking-[var(--h2-letter-spacing)] leading-[var(--h2-line-height)] [font-style:var(--h2-font-style)]"
        }  
        return css
    }

    return (
      <Card className={styling()}>
        <div className="relative top-[-47px] left-[-23px] w-20 h-[73px] flex items-center justify-center">
          <div className="relative w-full h-full rounded-md flex items-center justify-center">
            <Search className="text-gray-800 w-15 h-15 absolute" />
          </div>
        </div>
  
        <CardContent className="px-4 -mt-8">
          <h2 className={styling2()}>
            {header}
          </h2>
  
          <ul className="mt-4 space-y-1">
            {Features.map((feature, index) => (
              <li
                key={index}
                className="flex items-start font-['Open_Sans-Regular',Helvetica] font-normal text-[#e0dddd] text-[13px] leading-[18.6px]"
              >
                <span className="mr-2">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }